// Kiểm tra luật thơ lục bát (4 câu: 6-8-6-8) cho quẻ xăm "Chùa An Nhiên".
// Dùng: node content/tools/lucbat.mjs <file.json>   (file là mảng quẻ hoặc 1 quẻ có trường "tho")
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TRAC_MARKS = new Set(['́', '̉', '̃', '̣']); // sắc, hỏi, ngã, nặng
const TONE_MARKS = new Set(['̀', ...TRAC_MARKS]);

export function syllables(line) {
  return line
    .normalize('NFC')
    .replace(/[.,;:!?…"“”'‘’()\[\]–—-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** 'B' (bằng: ngang/huyền) hoặc 'T' (trắc: sắc/hỏi/ngã/nặng) */
export function thanh(word) {
  for (const ch of word.normalize('NFD')) if (TRAC_MARKS.has(ch)) return 'T';
  return 'B';
}
export function isHuyen(word) {
  return word.normalize('NFD').includes('̀');
}

function stripTone(word) {
  return [...word.normalize('NFD')].filter((c) => !TONE_MARKS.has(c)).join('').normalize('NFC');
}

const INITIALS = ['ngh', 'ng', 'nh', 'ch', 'gh', 'kh', 'ph', 'th', 'tr', 'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x'];
const VOWELS = 'aăâeêioôơuưy';

/** Phần vần (bỏ phụ âm đầu, bỏ dấu thanh, bỏ âm đệm o/u) để so vần. */
export function van(word) {
  let w = stripTone(word.toLowerCase());
  if (w.startsWith('qu') && w.length > 2) w = w.slice(2);
  else if (w.startsWith('gi') && w.length > 2 && VOWELS.includes(w[2])) w = w.slice(2);
  else {
    for (const i of INITIALS) {
      if (w.startsWith(i) && w.length > i.length) { w = w.slice(i.length); break; }
    }
  }
  // bỏ âm đệm (oa, oe, uy, uâ, uê, uơ) khi sau nó còn nguyên âm
  if (w.length > 1 && (w[0] === 'o' || w[0] === 'u') && 'aăeyâêơ'.includes(w[1])) w = w.slice(1);
  if (w === 'y') w = 'i';
  else if (w.startsWith('yê')) w = 'i' + w.slice(1);
  return w;
}

/** Vần chính (giống hệt) */
export function vanKhop(a, b) {
  return van(a) === van(b);
}

/** Vần thông (a/ă/â, o/ô/ơ, e/ê cùng âm cuối) — chấp nhận nhưng cảnh báo */
export function vanThong(a, b) {
  const norm = (v) => v.replace(/[ăâ]/g, 'a').replace(/[ôơ]/g, 'o').replace(/ê/g, 'e');
  return norm(van(a)) === norm(van(b));
}

/** Trả về { errors: string[], warnings: string[] } */
export function checkLucBat(lines) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(lines) || lines.length !== 4) {
    return { errors: ['thơ phải là mảng đúng 4 câu'], warnings };
  }
  const s = lines.map(syllables);
  const expect = [6, 8, 6, 8];
  s.forEach((ws, i) => {
    if (ws.length !== expect[i]) errors.push(`câu ${i + 1} có ${ws.length} tiếng, cần ${expect[i]}`);
  });
  if (errors.length) return { errors, warnings };
  const rule = (ws, pos, want, i) => {
    const t = thanh(ws[pos - 1]);
    if (t !== want) errors.push(`câu ${i + 1}: tiếng ${pos} "${ws[pos - 1]}" phải ${want === 'B' ? 'bằng' : 'trắc'}`);
  };
  s.forEach((ws, i) => {
    rule(ws, 2, 'B', i);
    rule(ws, 4, 'T', i);
    rule(ws, 6, 'B', i);
    if (ws.length === 8) {
      rule(ws, 8, 'B', i);
      if (thanh(ws[5]) === 'B' && thanh(ws[7]) === 'B' && isHuyen(ws[5]) === isHuyen(ws[7])) {
        warnings.push(`câu ${i + 1}: tiếng 6 "${ws[5]}" và tiếng 8 "${ws[7]}" nên khác thanh (một huyền, một ngang)`);
      }
    }
  });
  const pairs = [
    [s[0][5], s[1][5], 'tiếng 6 câu 1 ↔ tiếng 6 câu 2'],
    [s[1][7], s[2][5], 'tiếng 8 câu 2 ↔ tiếng 6 câu 3'],
    [s[2][5], s[3][5], 'tiếng 6 câu 3 ↔ tiếng 6 câu 4'],
  ];
  for (const [a, b, label] of pairs) {
    if (vanKhop(a, b)) continue;
    if (vanThong(a, b)) { warnings.push(`vần thông ${label}: "${a}" / "${b}" (chấp nhận, ưu tiên vần chính)`); continue; }
    errors.push(`lạc vần ${label}: "${a}" (${van(a)}) / "${b}" (${van(b)})`);
  }
  if (s[0][5].toLowerCase() === s[1][5].toLowerCase() || s[2][5].toLowerCase() === s[3][5].toLowerCase()) {
    warnings.push('vần lặp nguyên chữ (trùng tiếng), nên thay chữ khác cùng vần');
  }
  return { errors, warnings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) { console.error('Dùng: node content/tools/lucbat.mjs <file.json>'); process.exit(2); }
  let data = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) data = [data];
  let bad = 0, warn = 0;
  for (const q of data) {
    const { errors, warnings } = checkLucBat(q.tho);
    if (errors.length) { bad++; console.log(`✗ quẻ ${q.id}: ${errors.join('; ')}`); }
    for (const w of warnings) { warn++; console.log(`  ⚠ quẻ ${q.id}: ${w}`); }
  }
  console.log(`\n${data.length} quẻ, ${bad} lỗi luật, ${warn} cảnh báo.`);
  process.exit(bad ? 1 : 0);
}
