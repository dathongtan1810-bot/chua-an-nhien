#!/usr/bin/env node
// Kiểm tra toàn bộ nội dung "Chùa An Nhiên": schema, trùng lặp, độ dài, luật lục bát, từ ngữ cấm dùng trong nội dung biên tập.
// Dùng: node content/validate.mjs [--strict]   (--strict: coi cảnh báo là lỗi)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLucBat } from './tools/lucbat.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes('--strict');
const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);
const len = (s) => [...s.normalize('NFC')].length;

// ---------- mini JSON Schema validator (tập con draft 2020-12) ----------
function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}
function validate(schema, v, path, out) {
  if (schema.type) {
    const types = [].concat(schema.type);
    const t = typeOf(v);
    const ok = types.some((x) => x === t || (x === 'number' && t === 'integer'));
    if (!ok) return out.push(`${path}: kiểu ${t}, cần ${types.join('|')}`);
  }
  if (schema.enum && !schema.enum.some((e) => e === v)) out.push(`${path}: giá trị "${v}" không thuộc enum`);
  if (typeof v === 'string') {
    if (schema.minLength != null && len(v) < schema.minLength) out.push(`${path}: dài ${len(v)} < ${schema.minLength}`);
    if (schema.maxLength != null && len(v) > schema.maxLength) out.push(`${path}: dài ${len(v)} > ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(v)) out.push(`${path}: không khớp mẫu ${schema.pattern}`);
  }
  if (typeof v === 'number') {
    if (schema.minimum != null && v < schema.minimum) out.push(`${path}: ${v} < ${schema.minimum}`);
    if (schema.maximum != null && v > schema.maximum) out.push(`${path}: ${v} > ${schema.maximum}`);
  }
  if (Array.isArray(v)) {
    if (schema.minItems != null && v.length < schema.minItems) out.push(`${path}: ${v.length} phần tử < ${schema.minItems}`);
    if (schema.maxItems != null && v.length > schema.maxItems) out.push(`${path}: ${v.length} phần tử > ${schema.maxItems}`);
    if (schema.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) out.push(`${path}: có phần tử trùng`);
    if (schema.items) v.forEach((x, i) => validate(schema.items, x, `${path}[${i}]`, out));
  }
  if (typeOf(v) === 'object') {
    for (const r of schema.required || []) if (!(r in v)) out.push(`${path}: thiếu "${r}"`);
    for (const [k, x] of Object.entries(v)) {
      if (schema.properties && k in schema.properties) validate(schema.properties[k], x, `${path}.${k}`, out);
      else if (schema.additionalProperties === false) out.push(`${path}: thừa khóa "${k}"`);
      else if (typeof schema.additionalProperties === 'object') validate(schema.additionalProperties, x, `${path}.${k}`, out);
    }
  }
  return out;
}

function load(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { err(rel, 'không tồn tại'); return null; }
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { err(rel, `JSON lỗi: ${e.message}`); return null; }
}
function checkSchema(rel, schemaName) {
  const data = load(rel);
  const schema = load(schemaName);
  if (!data || !schema) return null;
  const out = validate(schema, data, '$', []);
  out.slice(0, 30).forEach((m) => err(rel, m));
  if (out.length > 30) err(rel, `… và ${out.length - 30} lỗi schema khác`);
  return data;
}

// ---------- tiện ích ----------
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function dupCheck(rel, items, getter, label) {
  const seen = new Map();
  items.forEach((it, i) => {
    const key = norm(getter(it) ?? '');
    if (!key) return;
    if (seen.has(key)) err(rel, `${label} trùng: mục ${seen.get(key)} và ${it.id ?? i}`);
    else seen.set(key, it.id ?? i);
  });
}
function idSeq(rel, items, n) {
  items.forEach((it, i) => { if (it.id !== i + 1) err(rel, `id thứ ${i + 1} là ${it.id}, cần liên tục 1..${n}`); });
}
function sameIds(rel, vi, en) {
  if (!vi || !en) return;
  const a = vi.map((x) => x.id).join(',');
  const b = en.map((x) => x.id).join(',');
  if (a !== b) err(rel, 'danh sách id không khớp với bản tiếng Việt');
}
const VI_MARK = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
function hasVietnamese(rel, items, getter) {
  items.forEach((it) => { const t = getter(it); if (t && !VI_MARK.test(t)) warn(rel, `mục ${it.id}: có vẻ thiếu dấu tiếng Việt: "${t.slice(0, 40)}"`); });
}
function allText(o) { return typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(allText) : o && typeof o === 'object' ? Object.values(o).flatMap(allText) : []; }

// Cụm từ không được xuất hiện trong nội dung biên tập (mê tín, hù dọa, cúng tiền, tên chùa thật)
const CAM_BIEN_TAP = [
  'linh nghiệm', 'linh ứng', 'cầu gì được nấy', 'đại hung', 'đại cát', 'tai họa', 'tai hoạ', 'xui xẻo', 'vận hạn', 'giải hạn',
  'bùa', 'trừ tà', 'cúng dường tiền', 'công đức tiền', 'chuyển khoản', 'quét mã', 'trúng số', 'xổ số',
  'chùa hương', 'bái đính', 'yên tử', 'tam chúc', 'chùa một cột', 'trấn quốc', 'vĩnh nghiêm', 'giác lâm', 'bà đen', 'thiên mụ', 'phật tích', 'pháp vân', 'quán sứ', 'xá lợi',
  'guaranteed', 'bad luck', 'curse', 'lottery',
];
function camCheck(rel, data) {
  for (const t of allText(data)) {
    const l = t.toLowerCase();
    for (const w of CAM_BIEN_TAP) if (l.includes(w)) err(rel, `chứa cụm không phù hợp "${w}": "${t.slice(0, 60)}…"`);
  }
}

// ---------- 1. Quẻ xăm ----------
const CD = ['gia-dao', 'cong-viec', 'suc-khoe', 'hoc-hanh', 'tinh-duyen', 'tai-loc'];
const que = checkSchema('que-xam.json', 'que-xam.schema.json');
if (que) {
  const F = 'que-xam.json';
  idSeq(F, que, 100);
  dupCheck(F, que, (q) => q.tieuDe, 'tiêu đề');
  dupCheck(F, que, (q) => q.loiGiai, 'lời giải');
  dupCheck(F, que, (q) => q.loiKhuyen, 'lời khuyên');
  const lines = new Map();
  for (const q of que) {
    q.tho?.forEach((l) => { const k = norm(l); if (lines.has(k)) err(F, `câu thơ trùng ở quẻ ${lines.get(k)} và ${q.id}: "${l}"`); else lines.set(k, q.id); });
    if (Array.isArray(q.tho)) {
      const r = checkLucBat(q.tho);
      r.errors.forEach((m) => err(F, `quẻ ${q.id} (lục bát): ${m}`));
      r.warnings.forEach((m) => warn(F, `quẻ ${q.id} (lục bát): ${m}`));
    }
    // độ dài biên tập (D10)
    if (q.loiGiai && (len(q.loiGiai) < 120 || len(q.loiGiai) > 600)) warn(F, `quẻ ${q.id}: lời giải ${len(q.loiGiai)} ký tự (khuyến nghị 120–600)`);
    if (q.loiKhuyen && (len(q.loiKhuyen) < 30 || len(q.loiKhuyen) > 220)) warn(F, `quẻ ${q.id}: lời khuyên ${len(q.loiKhuyen)} ký tự (khuyến nghị 30–220)`);
    for (const k of CD) { const t = q.loiGiaiTheoChuDe?.[k]; if (t && (len(t) < 50 || len(t) > 300)) warn(F, `quẻ ${q.id}: ${k} ${len(t)} ký tự (khuyến nghị 50–300)`); }
  }
  hasVietnamese(F, que, (q) => q.loiGiai);
  camCheck(F, que);
  // độ phủ chủ đề
  const cnt = Object.fromEntries(CD.map((k) => [k, 0]));
  que.forEach((q) => q.chuDe?.forEach((c) => cnt[c]++));
  for (const [k, n] of Object.entries(cnt)) if (n < 10) warn(F, `chủ đề ${k} chỉ có ${n} quẻ (nên ≥ 10)`);
  // vần gieo lặp lại quá nhiều
  const rhymes = new Map();
  que.forEach((q) => { const w = q.tho?.[0]?.trim().split(/\s+/).pop()?.toLowerCase(); if (w) rhymes.set(w, (rhymes.get(w) || 0) + 1); });
  for (const [w, n] of rhymes) if (n > 4) warn(F, `chữ gieo vần câu 1 "${w}" dùng ${n} lần (nên đa dạng)`);
}
const queEn = checkSchema('i18n/en/que-xam.json', 'que-xam.schema.json');
if (queEn) { sameIds('i18n/en/que-xam.json', que, queEn); dupCheck('i18n/en/que-xam.json', queEn, (q) => q.tieuDe, 'title'); camCheck('i18n/en/que-xam.json', queEn); }

// ---------- 2. Từ cấm ----------
const tc = checkSchema('tu-cam.json', 'tu-cam.schema.json');
if (tc) {
  const F = 'tu-cam.json';
  const seen = new Set();
  for (const t of tc.tuCam || []) { const k = t.tu.normalize('NFC').toLowerCase(); if (seen.has(k)) err(F, `từ trùng: "${t.tu}"`); seen.add(k); }
  for (const a of tc.allowlist || []) if (seen.has(a.normalize('NFC').toLowerCase())) err(F, `"${a}" vừa trong allowlist vừa trong tuCam`);
  if (!(tc.allowlist || []).some((a) => a.toLowerCase().includes('dâm bụt'))) err(F, 'allowlist thiếu "dâm bụt"');
}

// ---------- 3. Sự kiện âm lịch ----------
for (const rel of ['su-kien-am-lich.json', 'i18n/en/su-kien-am-lich.json']) {
  const d = checkSchema(rel, 'su-kien-am-lich.schema.json');
  if (!d) continue;
  dupCheck(rel, d, (x) => x.id, 'id');
  dupCheck(rel, d, (x) => x.ten, 'tên');
  camCheck(rel, d);
  if (rel.startsWith('su-kien')) {
    const must = [[1, 1], [1, 15], [2, 19], [6, 19], [9, 19], [4, 15], [7, 15], [12, 8], [null, 1], [null, 15]];
    for (const [m, dd] of must) if (!d.some((x) => x.thang === m && x.ngay === dd)) err(rel, `thiếu sự kiện ${dd}/${m ?? 'hằng tháng'}`);
  }
}
{
  const vi = existsSync(join(ROOT, 'su-kien-am-lich.json')) ? JSON.parse(readFileSync(join(ROOT, 'su-kien-am-lich.json'), 'utf8')) : null, en = existsSync(join(ROOT, 'i18n/en/su-kien-am-lich.json')) ? JSON.parse(readFileSync(join(ROOT, 'i18n/en/su-kien-am-lich.json'), 'utf8')) : null;
  if (vi && en) {
    const a = vi.map((x) => `${x.id}@${x.thang}/${x.ngay}`).join(','), b = en.map((x) => `${x.id}@${x.thang}/${x.ngay}`).join(',');
    if (a !== b) err('i18n/en/su-kien-am-lich.json', 'id/ngày/tháng không khớp bản tiếng Việt');
  }
}

// ---------- 4. Thông điệp ngày & 5. Lời nguyện ----------
// lời nguyện vốn có công thức mở đầu ("Con nguyện…") nên ngưỡng lặp cao hơn
for (const [base, n, nguong] of [['thong-diep-ngay', 366, 0.08], ['loi-nguyen-mau', 300, 0.45]]) {
  const vi = checkSchema(`${base}.json`, `${base}.schema.json`);
  const en = checkSchema(`i18n/en/${base}.json`, `${base}.schema.json`);
  for (const [rel, d] of [[`${base}.json`, vi], [`i18n/en/${base}.json`, en]]) {
    if (!d) continue;
    idSeq(rel, d, n);
    dupCheck(rel, d, (x) => x.noiDung, 'nội dung');
    camCheck(rel, d);
    // mở đầu lặp lại
    const starts = new Map();
    d.forEach((x) => { const w = norm(x.noiDung).split(' ').slice(0, 2).join(' '); starts.set(w, (starts.get(w) || 0) + 1); });
    for (const [w, c] of starts) if (c > Math.ceil(n * nguong)) warn(rel, `${c} mục cùng mở đầu "${w}" (nên đa dạng hơn)`);
  }
  if (vi) hasVietnamese(`${base}.json`, vi, (x) => x.noiDung);
  if (vi && en) {
    sameIds(`i18n/en/${base}.json`, vi, en);
    if (base === 'loi-nguyen-mau') vi.forEach((x, i) => { if (en[i] && en[i].chuDe !== x.chuDe) err(`i18n/en/${base}.json`, `id ${x.id}: chuDe khác bản tiếng Việt`); });
  }
}

// ---------- 6. Bộ nội dung theo mùa ----------
for (const mua of ['tet', 'ram-thang-gieng', 'phat-dan', 'vu-lan', 'trung-thu']) {
  const vi = checkSchema(`mua/${mua}.json`, 'mua/mua.schema.json');
  const en = checkSchema(`i18n/en/mua/${mua}.json`, 'mua/mua.schema.json');
  for (const [rel, d] of [[`mua/${mua}.json`, vi], [`i18n/en/mua/${mua}.json`, en]]) {
    if (!d) continue;
    camCheck(rel, d);
    for (const k of ['loiChao', 'thongDiep', 'loiNguyen']) dupCheck(rel, d[k] || [], (x) => x.noiDung, k);
  }
  if (vi) for (const q of vi.queDacBiet || []) {
    const r = checkLucBat(q.tho);
    r.errors.forEach((m) => err(`mua/${mua}.json`, `quẻ ${q.id} (lục bát): ${m}`));
    r.warnings.forEach((m) => warn(`mua/${mua}.json`, `quẻ ${q.id} (lục bát): ${m}`));
  }
  if (vi && en) for (const k of ['loiChao', 'thongDiep', 'loiNguyen', 'nhiemVu', 'queDacBiet']) sameIds(`i18n/en/mua/${mua}.json`, vi[k] || [], en[k] || []);
}

// ---------- 7. Thông báo đẩy ----------
{
  const vi = checkSchema('thong-bao-day.json', 'thong-bao-day.schema.json');
  const en = checkSchema('i18n/en/thong-bao-day.json', 'thong-bao-day.schema.json');
  for (const [rel, d] of [['thong-bao-day.json', vi], ['i18n/en/thong-bao-day.json', en]]) {
    if (!d) continue;
    dupCheck(rel, d, (x) => x.id, 'id');
    dupCheck(rel, d, (x) => x.noiDung, 'nội dung');
    camCheck(rel, d);
  }
  if (vi && en) sameIds('i18n/en/thong-bao-day.json', vi, en);
}

// ---------- 8. Chuỗi giao diện ----------
{
  const KHOA = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
  const vi = checkSchema('giao-dien.json', 'giao-dien.schema.json');
  const en = checkSchema('i18n/en/giao-dien.json', 'giao-dien.schema.json');
  for (const [rel, d] of [['giao-dien.json', vi], ['i18n/en/giao-dien.json', en]]) {
    if (!d) continue;
    camCheck(rel, d);
    for (const k of Object.keys(d)) if (!KHOA.test(k)) err(rel, `khóa "${k}" không đúng dạng nhom.khoa`);
  }
  if (vi && en) {
    for (const k of Object.keys(vi)) if (!(k in en)) err('i18n/en/giao-dien.json', `thiếu khóa "${k}"`);
    for (const k of Object.keys(en)) if (!(k in vi)) err('i18n/en/giao-dien.json', `thừa khóa "${k}" (không có trong bản tiếng Việt)`);
  }
}

// ---------- Kết quả ----------
for (const w of warnings) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✗ ${e}`);
console.log(`\n${errors.length} lỗi, ${warnings.length} cảnh báo.`);
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
