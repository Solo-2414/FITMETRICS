import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(backendRoot, 'src');
const violations = [];

const javascriptFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(directory, entry.name);
  if (entry.isDirectory()) return javascriptFiles(entryPath);
  return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
});

const firstArgument = (expression) => {
  let quote = null;
  let escaped = false;
  let depth = 0;
  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
    } else if (character === '(' || character === '[' || character === '{') {
      depth += 1;
    } else if (character === ')' || character === ']' || character === '}') {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      return expression.slice(0, index).trim();
    }
  }
  return expression.trim();
};

for (const file of javascriptFiles(sourceRoot)) {
  const source = fs.readFileSync(file, 'utf8');
  const callPattern = /\b(?:router|app)\.use\s*\(/g;
  let match;
  while ((match = callPattern.exec(source))) {
    const remainder = source.slice(match.index + match[0].length);
    const first = firstArgument(remainder);
    const end = remainder.indexOf(')');
    const call = end === -1 ? remainder : remainder.slice(0, end + 1);
    if (/(?:requireAuth|requireRole|requireAdmin)/.test(call)
      && !/^['"`]/.test(first)) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${path.relative(backendRoot, file)}:${line}`);
    }
  }
}

if (violations.length) {
  console.error('Invalid guarded use() calls:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log('Guard check passed.');
}
