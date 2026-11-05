/**
 * Bộ lọc nội dung đèn hoa đăng.
 *
 * Chiến lược (xem DECISIONS.md):
 *  1. Chuẩn hoá: NFC, chữ thường, bỏ ký tự điều khiển/zero-width, đổi leetspeak (0→o, 1→i, 3→e, 4→a, @→a, $→s...).
 *  2. Tách "âm tiết" theo ký tự không phải chữ/số. Các token 1 ký tự liền nhau được ghép lại
 *     (bắt "đ.ị.t", "d i t", "f-u-c-k"). Ký tự lặp được rút gọn ("nguuuu" → "ngu").
 *  3. So khớp theo dãy token:
 *     - Từ cấm 1 âm tiết CÓ dấu (vd "lồn") chỉ khớp khi văn bản cũng có dấu đúng như vậy,
 *       tránh chặn nhầm "lớn"/"lon". Khi văn bản viết không dấu, chỉ khớp nếu từ cấm đó
 *       nằm trong danh sách `unaccentedAlso` (vd "dit", "dm").
 *     - Cụm nhiều âm tiết & từ không dấu: khớp cả bản có dấu lẫn bản đã bỏ dấu.
 *  4. Bản "nén" (bỏ hết khoảng trắng/ký tự chèn) dùng cho từ cấm dài ≥ 5 ký tự để bắt "đ ồ c h ó"…
 *  5. Link, email, số điện thoại (kể cả chèn khoảng trắng/dấu chấm, viết "không chín...") và từ khoá quảng cáo.
 */
import { LIMITS } from '../../../shared/protocol.js';

export type RejectReason = 'empty' | 'too_long' | 'banned_word' | 'link' | 'phone' | 'ads' | 'spam';

export interface FilterResult {
  ok: boolean;
  reason?: RejectReason;
  /** Văn bản đã làm sạch (NFC, gộp khoảng trắng) để lưu. */
  clean: string;
  match?: string;
}

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i', '|': 'l', '€': 'e' };

const VIET_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/;

export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFC');
}

/** Làm sạch hiển thị: NFC, bỏ ký tự điều khiển & zero-width, gộp khoảng trắng. */
export function cleanText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[\p{Cf}\p{Zl}\p{Zp}]/gu, '')
    .replace(/[\p{Cc}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function leet(s: string): string {
  let out = '';
  for (const ch of s) out += LEET[ch] ?? ch;
  return out;
}

const collapseRepeats = (s: string) => s.replace(/(\p{L})\1{2,}/gu, '$1').replace(/(\p{L})\1/gu, (m, c: string) => (/[a-z]/.test(c) ? c : m));

/** Tách token, ghép các token 1 ký tự liền nhau. */
export function tokenize(text: string): string[] {
  const base = leet(text.normalize('NFC').toLowerCase());
  const raw = base.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const t of raw) {
    if ([...t].length === 1) {
      buf += t;
      continue;
    }
    if (buf) {
      out.push(buf);
      buf = '';
    }
    out.push(t);
  }
  if (buf) out.push(buf);
  return out.map(collapseRepeats);
}

interface Pattern {
  word: string;
  tokens: string[]; // dạng có dấu (đã chuẩn hoá)
  plain: string[]; // dạng bỏ dấu
  compact: string; // bỏ dấu, nối liền
  compactMarked: string; // có dấu, nối liền
  hasMark: boolean;
  accentStrict: boolean;
}

function compile(word: string, unaccentedAlso: Set<string>): Pattern | null {
  const tokens = tokenize(word);
  if (!tokens.length) return null;
  const plain = tokens.map(stripDiacritics);
  const hasMark = tokens.some((t) => VIET_DIACRITIC.test(t));
  const accentStrict = tokens.length === 1 && hasMark && !unaccentedAlso.has(plain[0]!);
  return { word, tokens, plain, compact: collapseRepeats(plain.join('')), compactMarked: collapseRepeats(tokens.join('')), hasMark, accentStrict };
}

function seqMatchWhere(hay: string[], needle: string[], ok: (i: number) => boolean): boolean {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (!ok(i + j) || hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function seqIndexOf(hay: string[], needle: string[]): number {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * Bản nén khớp theo ranh giới token: nối các token liên tiếp i..j và so BẰNG với từ cấm đã nén.
 * Bắt "mấtdạy", "khốnnạn" (viết liền) mà không khớp nhầm "con nguyện" với "con ngu".
 */
function alignedCompactMatch(plain: string[], compact: string, ok: (i: number) => boolean): boolean {
  for (let i = 0; i < plain.length; i++) {
    let acc = '';
    for (let j = i; j < plain.length; j++) {
      if (!ok(j)) break;
      acc = collapseRepeats(acc + plain[j]!);
      if (acc.length > compact.length + 2) break;
      if (acc === compact) return true;
    }
  }
  return false;
}

// ---- Link / email / điện thoại / quảng cáo -------------------------------
const TLD = '(?:com|net|org|vn|io|co|me|info|biz|xyz|top|site|online|shop|store|club|app|link|live|tv|cc|ly|gg|asia|pro|fun|vip|bet)';
const LINK_RE = new RegExp(
  [
    'https?:\\/\\/',
    'www\\s*\\.',
    `\\b[\\p{L}\\p{N}-]{2,}\\s*(?:\\.|\\(\\.\\)|\\[\\.\\]|\\s(?:chấm|cham|dot)\\s)\\s*${TLD}\\b`,
    '\\b(?:bit\\.ly|t\\.me|fb\\.com|zalo\\.me|tinyurl)',
    '[\\w.+-]+@[\\w-]+\\.[\\w.]+',
  ].join('|'),
  'iu',
);
const PHONE_DIGITS_RE = /(?:\+?\d[\s.\-_()/]*){9,}/;
const DIGIT_WORDS: Record<string, string> = {
  khong: '0', không: '0', mot: '1', một: '1', hai: '2', ba: '3', bon: '4', bốn: '4', tu: '4', tư: '4',
  nam: '5', năm: '5', lam: '5', lăm: '5', sau: '6', sáu: '6', bay: '7', bảy: '7', tam: '8', tám: '8', chin: '9', chín: '9',
};

function hasPhone(text: string): boolean {
  const t = leet(text.toLowerCase()).replace(/[oO]/g, (c, i, s: string) => (/\d/.test(s[i - 1] ?? '') || /\d/.test(s[i + 1] ?? '') ? '0' : c));
  if (PHONE_DIGITS_RE.test(t)) return true;
  // Số viết bằng chữ: "không chín một hai ..." – ≥ 7 chữ-số liên tiếp
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  let run = 0;
  for (const w of words) {
    if (DIGIT_WORDS[w] !== undefined || /^\d+$/.test(w)) {
      run += /^\d+$/.test(w) ? w.length : 1;
      if (run >= 9) return true;
    } else run = 0;
  }
  return false;
}

/** Từ khoá quảng cáo "mạnh": 1 lần là chặn. */
export const DEFAULT_ADS_KEYWORDS = [
  'zalo', 'telegram', 'inbox', 'ib mình', 'ib em', 'hotline', 'sđt', 'sdt', 'mã giảm giá', 'freeship', 'mua ngay', 'shopee', 'lazada', 'tiktok shop',
  'việc nhẹ lương cao', 'kiếm tiền online', 'vay tiền', 'vay vốn', 'nhà cái', 'cá cược', 'cá độ', 'casino', 'lô đề', 'tài xỉu', 'nổ hũ', 'bắn cá',
  'đăng ký ngay', 'sub kênh', 'kênh youtube', 'fanpage', 'forex', 'đa cấp', 'uy tín giá rẻ',
];
/** Từ khoá "yếu": dễ xuất hiện trong lời nguyện thật (vd "không mua chỉ vì giảm giá") → cần ≥ 2 từ mới chặn. */
export const DEFAULT_WEAK_ADS_KEYWORDS = [
  'giảm giá', 'khuyến mãi', 'liên hệ', 'kết bạn', 'follow', 'order', 'đặt hàng', 'click', 'subscribe', 'bitcoin', 'crypto', 'kiếm tiền', 'số điện thoại', 'giá rẻ', 'ưu đãi', 'link',
];

export interface FilterConfig {
  words: string[];
  /** Từ cấm 1 âm tiết nhưng vẫn chặn khi viết không dấu (vd "dit", "dm"). */
  unaccentedAlso?: string[];
  adsKeywords?: string[];
  weakAdsKeywords?: string[];
  maxChars?: number;
}

export class ContentFilter {
  private patterns: Pattern[] = [];
  private ads: Pattern[] = [];
  private weakAds: Pattern[] = [];
  private maxChars: number;

  constructor(cfg: FilterConfig) {
    this.maxChars = cfg.maxChars ?? LIMITS.LANTERN_MAX_CHARS;
    this.setWords(cfg.words, cfg.unaccentedAlso ?? DEFAULT_UNACCENTED_ALSO);
    const ua = new Set<string>();
    this.ads = (cfg.adsKeywords ?? DEFAULT_ADS_KEYWORDS)
      .map((w) => compile(w, ua))
      .filter((p): p is Pattern => !!p)
      .map((p) => ({ ...p, accentStrict: false }));
    this.weakAds = (cfg.weakAdsKeywords ?? DEFAULT_WEAK_ADS_KEYWORDS)
      .map((w) => compile(w, ua))
      .filter((p): p is Pattern => !!p)
      .map((p) => ({ ...p, accentStrict: false }));
  }

  setWords(words: string[], unaccentedAlso: string[] = DEFAULT_UNACCENTED_ALSO): void {
    const ua = new Set(unaccentedAlso.map((w) => stripDiacritics(w.toLowerCase())));
    const seen = new Set<string>();
    this.patterns = [];
    for (const w of words) {
      const p = compile(w, ua);
      if (!p || seen.has(p.tokens.join(' '))) continue;
      seen.add(p.tokens.join(' '));
      this.patterns.push(p);
    }
  }

  get wordCount(): number {
    return this.patterns.length;
  }

  /** Trả về từ cấm đầu tiên khớp. `marked[i]` = token i của văn bản có dấu tiếng Việt. */
  private matchList(list: Pattern[], tokens: string[], plain: string[], marked: boolean[], useCompact: boolean): string | undefined {
    for (const p of list) {
      if (seqIndexOf(tokens, p.tokens) >= 0) return p.word;
      if (p.accentStrict) continue; // từ 1 âm tiết có dấu: chỉ khớp đúng dấu
      // So không dấu: nếu từ cấm có dấu thì chỉ áp lên đoạn văn bản KHÔNG dấu
      // (người gõ không dấu), tránh "chỗ để" ≈ "chó đẻ".
      const needUnmarked = p.hasMark;
      if (seqMatchWhere(plain, p.plain, (i) => !needUnmarked || !marked[i])) return p.word;
      if (useCompact && p.compact.length >= 4) {
        if (alignedCompactMatch(tokens, p.compactMarked, () => true)) return p.word;
        if (alignedCompactMatch(plain, p.compact, (i) => !needUnmarked || !marked[i])) return p.word;
      }
    }
    return undefined;
  }

  check(input: string): FilterResult {
    const clean = cleanText(input);
    if (!clean) return { ok: false, reason: 'empty', clean };
    if ([...clean].length > this.maxChars) return { ok: false, reason: 'too_long', clean };

    const tokens = tokenize(clean);
    const plain = tokens.map(stripDiacritics);
    const marked = tokens.map((t) => VIET_DIACRITIC.test(t));

    const bad = this.matchList(this.patterns, tokens, plain, marked, true);
    if (bad) return { ok: false, reason: 'banned_word', clean, match: bad };
    if (LINK_RE.test(clean) || LINK_RE.test(stripDiacritics(clean))) return { ok: false, reason: 'link', clean };
    if (hasPhone(clean)) return { ok: false, reason: 'phone', clean };
    const ad = this.matchList(this.ads, tokens, plain, marked, false);
    if (ad) return { ok: false, reason: 'ads', clean, match: ad };
    const weak = this.weakAds.filter((p) => this.matchList([p], tokens, plain, marked, false));
    if (weak.length >= 2) return { ok: false, reason: 'ads', clean, match: weak.map((p) => p.word).join(', ') };
    // spam: một ký tự/âm tiết lặp lại quá nhiều
    if (/(.)\1{9,}/u.test(clean) || (tokens.length >= 6 && new Set(tokens).size === 1)) return { ok: false, reason: 'spam', clean };
    return { ok: true, clean };
  }
}

export const DEFAULT_UNACCENTED_ALSO = ['dit', 'dm', 'dmm', 'dcm', 'vcl', 'vkl', 'clm', 'cmm', 'dkm', 'loz', 'cl', 'vl', 'cc', 'dcmm', 'fuck', 'shit', 'bitch'];

/**
 * Đọc danh sách từ cấm từ JSON. Chấp nhận nhiều dạng:
 *  - ["a", "b"]
 *  - { "words": [...], "unaccentedAlso": [...] }
 *  - { "<nhóm>": [...], ... } (gộp mọi mảng chuỗi)
 *  - [{ "word": "a" }, ...] hoặc [{ "tu": "a" }]
 */
export function parseWordList(json: unknown): { words: string[]; unaccentedAlso?: string[] } {
  const words: string[] = [];
  let unaccentedAlso: string[] | undefined;
  const take = (v: unknown) => {
    if (typeof v === 'string') words.push(v);
    else if (Array.isArray(v)) v.forEach(take);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const w = o.word ?? o.tu ?? o.text ?? o.value;
      if (typeof w === 'string') {
        words.push(w);
        // các biến thể khai báo kèm
        for (const k of ['variants', 'bienThe', 'aliases']) if (Array.isArray(o[k])) take(o[k]);
        return;
      }
      for (const [k, val] of Object.entries(o)) {
        if (k === 'unaccentedAlso' && Array.isArray(val)) unaccentedAlso = val.filter((x): x is string => typeof x === 'string');
        else if (!['version', 'updatedAt', 'note', 'description', '$schema'].includes(k)) take(val);
      }
    }
  };
  take(json);
  return { words: [...new Set(words.map((w) => w.trim()).filter(Boolean))], unaccentedAlso };
}
