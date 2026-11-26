// Guards against PostgREST PGRST201 errors from embeds with multiple foreign-key relationships.
// Run from /backend: node scripts/check-postgrest-embeds.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (entry !== 'node_modules') walk(full); } else if (entry.endsWith('.js')) files.push(full);
  }
}(root));

const problems = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const context = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
    if (/walk_in_visits\(/.test(line) && /from\(['"]payments['"]\)/.test(context)) problems.push([file, i + 1, 'payments -> walk_in_visits(...) needs !payments_walk_in_visit_id_fkey']);
    if (/[^_\w]payments\(/.test(line) && /from\(['"]walk_in_visits['"]\)/.test(context)) problems.push([file, i + 1, 'walk_in_visits -> payments(...) needs !payments_walk_in_visit_id_fkey']);
    if (/profiles\(/.test(line) && /from\(['"]identity_verifications['"]\)/.test(context)) problems.push([file, i + 1, 'identity_verifications -> profiles(...) needs !identity_verifications_member_id_fkey']);
  });
}
for (const [file, line, message] of problems) console.log(`${relative(root, file)}:${line}  ${message}`);
console.log(problems.length ? `\n${problems.length} ambiguous embed(s).` : 'No known ambiguous PostgREST embeds.');
process.exit(problems.length ? 1 : 0);
