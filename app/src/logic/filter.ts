/**
 * Bộ lọc lời nguyện (tiếng Việt + một ít tiếng Anh).
 *
 * Nguyên tắc tránh nhầm: tiếng Việt khi bỏ dấu rất dễ trùng từ thường
 * ("lồn"→"lon" = lon nước, "cặc"→"cac" = các, "đĩ"→"di" = đi, "buồi"→"buoi" = buổi,
 * "chó"→"cho" = cho). Vì vậy danh sách chia nhiều chế độ khớp:
 *  - 'exact'      : khớp nguyên từ/cụm từ CÓ DẤU (sau lowercase + NFC + leet + bỏ ký tự chèn)
 *  - 'fold'       : khớp nguyên từ/cụm từ sau khi BỎ DẤU (chỉ dùng cho từ không gây nhầm)
 *  - 'standalone' : bỏ dấu, chỉ bị chặn khi cả câu chỉ có đúng từ/cụm từ đó
 *  - 'sub'        : bỏ dấu, khớp cả khi là chuỗi con của một từ (fuck → fucking)
 *
 * Danh sách PROFANITY_LIST được export để backend dùng lại.
 */

export type ProfanityMode = 'exact' | 'fold' | 'standalone' | 'sub';

export interface ProfanityEntry {
  term: string;
  mode: ProfanityMode;
}

const e = (mode: ProfanityMode, ...terms: string[]): ProfanityEntry[] => terms.map((term) => ({ term, mode }));

export const PROFANITY_LIST: readonly ProfanityEntry[] = [
  // Viết tắt / teencode không dấu — an toàn để khớp nguyên từ sau khi bỏ dấu
  ...e('fold', 'dm', 'dmm', 'dcm', 'dkm', 'dmcs', 'dcmm', 'vcl', 'vkl', 'vl', 'vcc', 'vclm', 'vcd', 'cc', 'clm', 'cmm', 'cmnr', 'loz', 'lozz', 'dkmm', 'dmml', 'ccmm'),
  // Cụm không dấu: chỉ những cụm hầu như không có nghĩa thường (tránh "vài lon", "ăn các", "con các bạn"...)
  ...e('fold', 'dit me', 'dit con me', 'dit cu', 'du me', 'du mia', 'deo me', 'dek', 'vai loz', 'suc vat', 'ngu nhu cho', 'ngu nhu bo', 'ngu nhu lon', 'thang cho chet', 'me may chet', 'deo biet', 'deo hieu'),
  // Có dấu — chỉ khớp đúng dấu để tránh nhầm với từ thường
  ...e('exact', 'lồn', 'cặc', 'buồi', 'đĩ', 'đéo', 'địt', 'đụ', 'đù', 'đm', 'đmm', 'đcm', 'đkm', 'đếch'),
  ...e('exact', 'chó má', 'chó chết', 'chó đẻ', 'đồ chó', 'thằng chó', 'con chó cái', 'óc chó', 'óc lợn', 'óc bò', 'mẹ mày', 'bố mày', 'má mày', 'cha mày', 'tổ cha', 'tiên sư', 'con đĩ', 'thằng ngu', 'con ngu', 'đồ ngu', 'ngu như chó', 'ngu như bò', 'ngu như lợn', 'súc sinh', 'súc vật', 'mất dạy', 'khốn nạn', 'thằng khốn', 'đồ khốn', 'chết mẹ', 'chết cha', 'đù má', 'đụ má', 'đụ mẹ', 'đéo biết', 'cái lồn', 'vãi lồn', 'vãi cả lồn', 'vãi l', 'đồ điếm', 'con điếm'),
  // Chỉ chặn khi cả câu chỉ là từ đó (vì bỏ dấu thì trùng từ thường)
  ...e('standalone', 'lon', 'cac', 'buoi', 'deo', 'dit', 'du', 'di', 'cho', 'ngu', 'cl', 'ml', 'vai'),
  // Tiếng Anh
  ...e('sub', 'fuck', 'fuk', 'fck', 'bitch', 'motherf', 'asshole', 'bullshit', 'nigger', 'nigga', 'faggot', 'whore', 'cunt'),
  ...e('fold', 'shit', 'shits', 'shitty', 'dick', 'dicks', 'slut', 'sluts', 'bastard', 'wtf', 'stfu', 'fu', 'pussy', 'cock', 'dickhead', 'jerk off', 'son of a bitch', 'piss off'),
];

export const FILTER_MAX_LEN = 120;

export type CheckReason = 'profanity' | 'too_long' | 'empty' | 'link' | 'phone' | 'spam';

export interface CheckResult {
  ok: boolean;
  reason?: CheckReason;
}

// ---------- chuẩn hoá ----------

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
/** Ký tự hay bị chèn vào giữa từ để lách: đ.m, d-m, f*ck, d_m */
const INNER_SEP = /[.\-_*+~^`|\\/'"]/g;
/** Tách token: khoảng trắng và dấu câu "ngắt" */
const TOKEN_RE = /[^\s,!?;:()[\]{}<>“”‘’…«»]+/gu;

function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function applyLeet(tok: string): string {
  // chỉ đổi leet nếu token có chữ cái (tránh biến "2024" thành chữ)
  if (!/\p{L}/u.test(tok)) return tok;
  return tok.replace(/[013457@$]/g, (c) => LEET[c] ?? c);
}

function collapseAll(s: string): string {
  return s.replace(/(.)\1+/gu, '$1');
}

function collapseTo2(s: string): string {
  return s.replace(/(.)\1{2,}/gu, '$1$1');
}

interface Tok {
  start: number;
  end: number;
  /** có dấu, đã lowercase/NFC/leet/bỏ ký tự chèn */
  exact: string;
  /** bỏ dấu */
  fold: string;
}

function baseForm(raw: string): string {
  return applyLeet(raw.normalize('NFC').toLowerCase()).replace(INNER_SEP, '');
}

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  for (const m of s.matchAll(TOKEN_RE)) {
    const raw = m[0];
    const exact = baseForm(raw);
    if (!exact) continue;
    const start = m.index ?? 0;
    out.push({ start, end: start + raw.length, exact, fold: stripDiacritics(exact) });
  }
  // gộp chuỗi các chữ cái đơn lẻ: "f u c k" → "fuck", "đ m" → "đm"
  const merged: Tok[] = [];
  let i = 0;
  while (i < out.length) {
    const t = out[i] as Tok;
    if ([...t.exact].length === 1 && /\p{L}/u.test(t.exact)) {
      let j = i;
      while (j + 1 < out.length && [...(out[j + 1] as Tok).exact].length === 1 && /\p{L}/u.test((out[j + 1] as Tok).exact)) j++;
      if (j > i) {
        const run = out.slice(i, j + 1);
        const exact = run.map((r) => r.exact).join('');
        merged.push({ start: t.start, end: (out[j] as Tok).end, exact, fold: stripDiacritics(exact) });
        i = j + 1;
        continue;
      }
    }
    merged.push(t);
    i++;
  }
  return merged;
}

/**
 * Chuẩn hoá chuỗi tiếng Việt để so khớp: lowercase, bỏ dấu (đ→d), leet (0→o, 1→i, 3→e, 4→a,
 * 5→s, 7→t, @→a, $→s), bỏ ký tự chèn (. - _ *), gộp chữ cái đơn tách rời bằng khoảng trắng,
 * gộp ký tự lặp (aaa→a), gộp khoảng trắng.
 */
export function normalizeVi(s: string): string {
  return tokenize(s)
    .map((t) => collapseAll(t.fold))
    .join(' ');
}

// ---------- so khớp ----------

interface CompiledEntry {
  words: string[];
  mode: ProfanityMode;
}

const COMPILED: CompiledEntry[] = PROFANITY_LIST.map(({ term, mode }) => {
  const norm = mode === 'exact' ? term.normalize('NFC').toLowerCase() : stripDiacritics(term.toLowerCase());
  return { words: norm.split(/\s+/).filter(Boolean), mode };
});

function variants(s: string): string[] {
  const a = collapseTo2(s);
  const b = collapseAll(s);
  return a === s ? (b === s ? [s] : [s, b]) : [s, a, b];
}

function wordMatches(tok: Tok, word: string, mode: ProfanityMode, single: boolean): boolean {
  const forms = variants(mode === 'exact' ? tok.exact : tok.fold);
  if (forms.includes(word)) return true;
  if (mode === 'sub' && single) return forms.some((f) => f.includes(word));
  return false;
}

interface Span {
  start: number;
  end: number;
}

function findMatches(s: string): Span[] {
  const toks = tokenize(s);
  const spans: Span[] = [];
  for (const entry of COMPILED) {
    const n = entry.words.length;
    if (n === 0) continue;
    if (entry.mode === 'standalone' && toks.length !== n) continue;
    for (let i = 0; i + n <= toks.length; i++) {
      let ok = true;
      for (let j = 0; j < n; j++) {
        if (!wordMatches(toks[i + j] as Tok, entry.words[j] as string, entry.mode, n === 1)) {
          ok = false;
          break;
        }
      }
      if (ok) spans.push({ start: (toks[i] as Tok).start, end: (toks[i + n - 1] as Tok).end });
    }
  }
  return spans;
}

export function hasProfanity(s: string): boolean {
  return findMatches(s).length > 0;
}

// ---------- link / phone / spam ----------

const LINK_RES: RegExp[] = [
  /https?:\/\//i,
  /\bwww\s*\./i,
  /[\p{L}\d-]\s*(?:\.|\[\.\]|\(\.\)|\(dot\)|\s+dot\s+)\s*(?:com|net|org|vn|io|me|xyz|info|co|ly|gg|tk|top|site|online|shop|app|link|live|club|biz|ru|cn)\b/iu,
  /\b(?:zalo|telegram|t\.me|whatsapp|wechat)\b/i,
];

const PHONE_RE = /(?:\+?\d[\s.\-()]*){9,}/;

export function hasLink(s: string): boolean {
  return LINK_RES.some((r) => r.test(s));
}

export function hasPhone(s: string): boolean {
  // leet chữ → số cũng hay bị dùng để lách: "o9o1..." — giữ đơn giản, chỉ xét chữ số
  return PHONE_RE.test(s);
}

function isSpam(s: string): boolean {
  if (/(.)\1{7,}/u.test(s.replace(/\s/g, ''))) return true;
  const words = s.toLowerCase().split(/\s+/).filter(Boolean);
  let run = 1;
  for (let i = 1; i < words.length; i++) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    if (run >= 5) return true;
  }
  return false;
}

/** Kiểm tra một lời nguyện trước khi gửi/hiển thị. */
export function checkText(s: string, maxLen = FILTER_MAX_LEN): CheckResult {
  const t = (s ?? '').trim();
  if (!t || !/[\p{L}\p{N}]/u.test(t)) return { ok: false, reason: 'empty' };
  if ([...t].length > maxLen) return { ok: false, reason: 'too_long' };
  if (hasLink(t)) return { ok: false, reason: 'link' };
  if (hasPhone(t)) return { ok: false, reason: 'phone' };
  if (hasProfanity(t)) return { ok: false, reason: 'profanity' };
  if (isSpam(t)) return { ok: false, reason: 'spam' };
  return { ok: true };
}

/** Thay các từ/cụm từ xấu bằng "***" (giữ nguyên phần còn lại). */
export function maskText(s: string): string {
  const spans = findMatches(s).sort((a, b) => a.start - b.start);
  if (spans.length === 0) return s;
  const merged: Span[] = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && sp.start <= last.end) last.end = Math.max(last.end, sp.end);
    else merged.push({ ...sp });
  }
  let out = '';
  let pos = 0;
  for (const sp of merged) {
    // giữ dấu câu ở đầu/cuối token
    let a = sp.start;
    let b = sp.end;
    while (a < b && !/[\p{L}\p{N}@$]/u.test(s[a] as string)) a++;
    while (b > a && !/[\p{L}\p{N}@$]/u.test(s[b - 1] as string)) b--;
    out += s.slice(pos, a) + '***';
    pos = b;
  }
  return out + s.slice(pos);
}
