// Gộp các lô quẻ trong content/_parts/ thành content/que-xam.json và content/i18n/en/que-xam.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const parts = join(root, '_parts');
const GHI_CHU = {
  vi: 'Quẻ mang tính chiêm nghiệm, giúp bạn soi lại lòng mình; không phải lời tiên đoán.',
  en: 'This verse is for reflection, to help you look within; it is not a prediction.',
};
const ORDER = ['id', 'tieuDe', 'tho', 'loiGiai', 'loiGiaiTheoChuDe', 'loiKhuyen', 'chuDe', 'ghiChu'];

function build(prefix, lang, out) {
  const files = readdirSync(parts).filter((f) => new RegExp(`^${prefix}que-xam-\\d+\\.json$`).test(f)).sort();
  const all = files.flatMap((f) => JSON.parse(readFileSync(join(parts, f), 'utf8')));
  all.sort((a, b) => a.id - b.id);
  const res = all.map((q) => {
    const o = {};
    for (const k of ORDER) o[k] = k === 'ghiChu' ? GHI_CHU[lang] : q[k];
    for (const k of Object.keys(o)) if (typeof o[k] === 'string') o[k] = o[k].normalize('NFC').trim();
    // D29: bỏ dấu câu cuối mỗi dòng thơ cho thống nhất giữa các lô
    o.tho = o.tho.map((l) => l.normalize('NFC').trim().replace(/[\s.,;:!…]+$/u, ''));
    return o;
  });
  writeFileSync(join(root, out), JSON.stringify(res, null, 2) + '\n');
  console.log(`${out}: ${res.length} quẻ từ ${files.length} lô`);
}
build('', 'vi', 'que-xam.json');
build('en-', 'en', 'i18n/en/que-xam.json');
