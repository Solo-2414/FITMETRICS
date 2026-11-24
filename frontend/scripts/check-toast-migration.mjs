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
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (!rule.re.test(line)) continue;
      if (/toast-allow(?::|=)/.test(line) || /toast-allow(?::|=)/.test(lines[index - 1] || '')) continue;
      if (/field-error(?::|=)/.test(line) || /field-error(?::|=)/.test(lines[index - 1] || '')) continue;
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
