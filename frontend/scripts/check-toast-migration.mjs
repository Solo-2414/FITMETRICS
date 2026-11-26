// Progress meter for the global toast migration. Run from /frontend:  node scripts/check-toast-migration.mjs
// Exit code 0 only when no old-style feedback is left. A line may be kept on purpose by putting
//   toast-allow: <reason>
// in a comment on the same line or the line directly above (use it only for persistent banners).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const rules = [
  { name: 'Bootstrap alert banner', re: /alert alert-(danger|success|warning|info)|className=\{?["'`]alert[ "'`]/ },
  { name: 'role alert feedback', re: /role=["']alert["']/ },
  { name: 'inline text-danger feedback', re: /text-danger/ },
  { name: 'inline red feedback color', re: /(?:color\s*:\s*["']?#f87171|className=["'][^"']*text-danger)/i },
  { name: 'window.alert', re: /window\.alert\s*\(/ },
  { name: 'alert()', re: /(^|[^\w.$])alert\s*\(/ },
  { name: 'window.confirm', re: /window\.confirm\s*\(/ },
  { name: 'old ClerkToast import', re: /ClerkToast/ },
  { name: 'page-rendered toast markup', re: /role=["']alert["'][^>]*className=\{?[^}]*toast/i },
];

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (entry !== 'node_modules') walk(full); } else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(full);
  }
};
walk(root);

const findings = [];
for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (rel.startsWith('components/ui/toast/')) continue; // the toast system itself
  if (rel === 'components/ui/InlineError.jsx') continue; // shared inline-load error component
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = source.split(/\r?\n/);
  const lineOffsets = [];
  let sourceOffset = 0;
  for (const line of lines) {
    lineOffsets.push(sourceOffset);
    sourceOffset += line.length + 1;
  }
  const fieldErrorRanges = [];
  const fieldErrorTag = /<([A-Za-z][\w.]*)\b[^>]*data-field-error=["']([^"']+)["'][^>]*>[\s\S]*?<\/\1>/gs;
  for (const match of source.matchAll(fieldErrorTag)) {
    if (match[2].trim().length >= 8 && match[2].trim() !== 'field-error') {
      fieldErrorRanges.push([match.index, match.index + match[0].length]);
    }
  }
  const isFieldErrorAt = (index) => fieldErrorRanges.some(([start, end]) => index >= start && index < end);
  const lineOffset = (index) => source.slice(0, index).split(/\r?\n/).length - 1;
  const setErrorState = /\[\s*([A-Za-z_$][\w$]*)\s*,\s*setError\w*\s*\]\s*=\s*useState\b/g;
  for (const match of source.matchAll(setErrorState)) {
    const message = new RegExp(`\\{\\s*${match[1]}\\s*\\}`, 'g');
    for (const rendered of source.matchAll(message)) {
      if (isFieldErrorAt(rendered.index)) continue;
      const line = lineOffset(rendered.index);
      if (/\bInlineError\b/.test(lines[line])) continue;
      findings.push({
        rel,
        line: line + 1,
        rule: 'setError state rendered as a message',
        text: lines[line].trim().slice(0, 90),
      });
    }
  }
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (!rule.re.test(line)) continue;
      if (/toast-allow(?::|=)/.test(line) || /toast-allow(?::|=)/.test(lines[index - 1] || '')) continue;
      const offset = lineOffsets[index];
      const markerLines = [line, lines[index - 1] || ''];
      const hasFieldErrorReason = markerLines.some((marker) => {
        const reason = marker.match(/(?:data-)?field-error(?::|=)\s*([^*"'\n]+)/i)?.[1]?.trim();
        return reason && reason.length >= 4 && reason !== 'field-error';
      });
      if (isFieldErrorAt(offset) || hasFieldErrorReason) continue;
      findings.push({ rel, line: index + 1, rule: rule.name, text: line.trim().slice(0, 90) });
    }
  });
}

const perFile = new Map();
for (const f of findings) perFile.set(f.rel, (perFile.get(f.rel) || 0) + 1);
for (const f of findings) console.log(`${f.rel}:${f.line}  [${f.rule}]  ${f.text}`);
console.log(`\n${findings.length} old-style feedback spot(s) in ${perFile.size} file(s) remaining.`);
if (perFile.size) console.log([...perFile].sort((a, b) => b[1] - a[1]).map(([f, n]) => `  ${n}  ${f}`).join('\n'));
process.exit(findings.length ? 1 : 0);
