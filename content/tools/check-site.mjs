// Kiểm tra site/: mọi file HTML có lang, title, meta description, viewport; liên kết nội bộ tồn tại.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '../../site');
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(SITE);
const errors = [];
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const html = readFileSync(f, 'utf8');
  const rel = f.slice(SITE.length + 1);
  if (!/<html[^>]+lang="(vi|en)"/.test(html)) errors.push(`${rel}: thiếu lang`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${rel}: thiếu title`);
  if (!/name="description"/.test(html)) errors.push(`${rel}: thiếu meta description`);
  if (!/name="viewport"/.test(html)) errors.push(`${rel}: thiếu viewport`);
  for (const m of html.matchAll(/(?:href|src)="([^"#:?]+)(?:[#?][^"]*)?"/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(target) || target === '') continue;
    const p = target.startsWith('/') ? join(SITE, target) : resolve(dirname(f), target);
    const ok = existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
    if (!ok) errors.push(`${rel}: liên kết hỏng → ${target}`);
  }
}
// D31: thơ mẫu trên landing (<p class="tho"><span>…</span></p>) phải khớp đúng một quẻ trong dữ liệu
const CONTENT = resolve(SITE, '../content');
for (const [page, data] of [['index.html', 'que-xam.json'], ['en/index.html', 'i18n/en/que-xam.json']]) {
  const f = join(SITE, page);
  if (!existsSync(f) || !existsSync(join(CONTENT, data))) continue;
  const html = readFileSync(f, 'utf8');
  const que = JSON.parse(readFileSync(join(CONTENT, data), 'utf8'));
  const known = new Set(que.map((q) => q.tho.join('\n')));
  for (const m of html.matchAll(/<p class="tho">([\s\S]*?)<\/p>/g)) {
    const lines = [...m[1].matchAll(/<span>([^<]*)<\/span>/g)].map((x) => x[1].trim());
    if (!known.has(lines.join('\n'))) errors.push(`${page}: thơ mẫu không khớp quẻ nào trong content/${data}: "${lines[0]}…"`);
  }
}
errors.forEach((e) => console.log(`✗ ${e}`));
console.log(`${files.length} file, ${errors.length} lỗi.`);
process.exit(errors.length ? 1 : 0);
