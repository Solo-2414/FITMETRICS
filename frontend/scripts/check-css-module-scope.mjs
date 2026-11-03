// Finds CSS rules that leak to the WHOLE app. In CSS Modules only class and id names are scoped;
// a bare element selector (button, h1, input, label, a, body, *, ...) becomes a GLOBAL rule as soon as the file is imported anywhere.
// Run from /frontend:  node scripts/check-css-module-scope.mjs      (exit 1 when something leaks)
// A selector is safe when it contains at least one .class or #id. Add  /* global-ok: reason */  on the line above to allow one on purpose.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (entry !== 'node_modules') walk(full); } else if (entry.endsWith('.module.css')) files.push(full);
  }
}(root));

const problems = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (index) => lineStarts.findLastIndex((start) => start <= index) + 1;

  let i = 0; let depth = 0; let selectorStart = 0; const stack = [];
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  for (i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (ch === '{') {
      const selector = stripped.slice(selectorStart, i).trim();
      const isAt = selector.startsWith('@');
      const inKeyframes = stack.some((s) => /^@(-\w+-)?keyframes/.test(s));
      stack.push(selector);
      if (!isAt && !inKeyframes && selector) {
        const allowed = /global-ok/.test(text.slice(Math.max(0, text.lastIndexOf('\n', text.lastIndexOf('\n', selectorStart - 1) - 1)), selectorStart));
        for (const part of selector.split(',').map((s) => s.trim()).filter(Boolean)) {
          const scoped = /[.#][A-Za-z_-]/.test(part.replace(/\[[^\]]*\]/g, '').replace(/\d+\.\d+/g, ''));
          if (!scoped && !allowed) problems.push({ file, line: lineOf(selectorStart + stripped.slice(selectorStart).search(/\S/)), selector: part });
        }
      }
      selectorStart = i + 1; depth += 1;
    } else if (ch === '}') { stack.pop(); depth -= 1; selectorStart = i + 1; } else if (ch === ';' && depth >= 0) { selectorStart = i + 1; }
  }
}

for (const p of problems) console.log(`${relative(root, p.file).replaceAll('\\', '/')}:${p.line}  leaks globally: ${p.selector}`);
console.log(problems.length ? `\n${problems.length} global-leaking selector(s) in CSS modules. Put them under a class, e.g. ".card button".` : 'No global-leaking selectors in CSS modules.');
process.exit(problems.length ? 1 : 0);
