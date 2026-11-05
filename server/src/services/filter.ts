/**
 * Bộ lọc nội dung đèn hoa đăng / biệt danh.
 *
 * Chiến lược (chi tiết: DECISIONS.md #17, #24, #25):
 *  1. Chuẩn hoá: NFC, chữ thường, bỏ ký tự điều khiển/zero-width.
 *  2. Tách token theo ký tự không phải chữ/số. Ký tự "lách" (0→o, 1→i, @→a, $→s…) được đổi khi đứng cạnh chữ cái;
 *     token 1 ký tự liền nhau được ghép ("đ.ị.t", "d i t", "f-u-c-k"); chữ lặp ≥ 3 lần được rút gọn.
 *     Mỗi token mang cờ `evasive` nếu có dấu hiệu lách (đổi ký tự, ghép chữ rời, kéo dài chữ).
 *  3. Allowlist (vd "con ngủ") được che trước khi so khớp.
 *  4. So khớp theo dãy token:
 *     - văn bản CÓ dấu chỉ so với dạng có dấu của từ cấm; so không dấu chỉ áp lên đoạn văn bản KHÔNG dấu;
 *     - từ cấm 1 âm tiết có dấu (vd "lồn") chỉ khớp đúng dấu, trừ khi nằm trong `unaccentedAlso`;
 *     - biến thể "lách" (tiền tố `~`, vd "~lon") chỉ khớp khi đoạn đó có dấu hiệu lách ("l0n", "l.o.n");
 *     - bản nén so theo ranh giới token ("mấtdạy", "khốnnạn").
 *  5. Link, email, số điện thoại (kể cả chèn khoảng trắng/dấu chấm, viết bằng chữ) và từ khoá quảng cáo.
 *
 * Mã hoá danh sách từ (bảng `banned_words`, trang admin): mỗi dòng 1 mục;
 *   "từ"   = từ cấm;  "~từ" = biến thể chỉ tính khi có dấu hiệu lách;  "+cụm" = allowlist (không bao giờ chặn);
 *   "=từ"  = chỉ khớp đúng chữ (không so dạng bỏ dấu) — dùng cho "tu" không dấu của tu-cam.json (vd "=ngu").
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

/** Ký tự lách "mạnh": chỉ cần cạnh 1 chữ cái. */
export const DEFAULT_STRONG_SUBS: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '€': 'e' };
/** Ký tự lách "yếu": cần chữ cái ở cả hai bên ("ngu!" không thành "ngui"). */
export const DEFAULT_WEAK_SUBS: Record<string, string> = { '!': 'i', '|': 'l' };

const VIET_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/;
const IS_LETTER = /\p{L}/u;
const MASK = '#';

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

const collapseRepeats = (s: string) => s.replace(/(\p{L})\1{2,}/gu, '$1').replace(/(\p{L})\1/gu, (m, c: string) => (/[a-z]/.test(c) ? c : m));

interface Subs {
  strong: Record<string, string>;
  weak: Record<string, string>;
}
const DEFAULT_SUBS: Subs = { strong: DEFAULT_STRONG_SUBS, weak: DEFAULT_WEAK_SUBS };

export interface Tokens {
  tokens: string[];
  /** Token chưa rút gọn chữ lặp. */
  raw: string[];
  evasive: boolean[];
}

/** Tách token kèm cờ lách. */
export function tokenizeDetailed(text: string, subs: Subs = DEFAULT_SUBS): Tokens {
  const chars = [...text.normalize('NFC').toLowerCase()];
  // 1) đổi ký tự lách theo "cụm": dãy liền nhau gồm chữ/số/ký tự lách. Ký tự lách mạnh (số, @, $)
  //    chỉ được đổi khi cụm có ít nhất 1 chữ cái ("4$$h0l3" → "asshole", nhưng "2026" giữ nguyên);
  //    ký tự lách yếu (!, |) cần chữ/ký tự lách ở cả hai bên ("ngu!" giữ nguyên).
  const isPart = (c: string | undefined) => !!c && (/[\p{L}\p{N}\p{M}]/u.test(c) || subs.strong[c] !== undefined || subs.weak[c] !== undefined);
  const mapped: Array<{ ch: string; sub: boolean }> = [];
  let i0 = 0;
  while (i0 < chars.length) {
    if (!isPart(chars[i0])) {
      mapped.push({ ch: ' ', sub: false });
      i0++;
      continue;
    }
    let j0 = i0;
    while (j0 < chars.length && isPart(chars[j0])) j0++;
    const run = chars.slice(i0, j0);
    const hasLetter = run.some((c) => IS_LETTER.test(c));
    const isDigit = (c: string | undefined) => !!c && /\p{N}/u.test(c);
    const isSym = (c: string | undefined) => !!c && subs.strong[c] !== undefined && !isDigit(c);
    const letterish = (c: string | undefined) => !!c && (IS_LETTER.test(c) || isSym(c));
    for (let k = 0; k < run.length; k++) {
      const c = run[k]!;
      const prevOk = k > 0 && (IS_LETTER.test(run[k - 1]!) || subs.strong[run[k - 1]!] !== undefined);
      const nextOk = k < run.length - 1 && (IS_LETTER.test(run[k + 1]!) || subs.strong[run[k + 1]!] !== undefined);
      // chữ số: chỉ đổi khi kề chữ cái/ký hiệu lách ("d1t" → "dit", "Mã D17" giữ "di7"; "4$$h0l3" → "asshole")
      const strongOk = hasLetter && (isSym(c) || (isDigit(c) && (letterish(run[k - 1]) || letterish(run[k + 1]))));
      if (subs.strong[c] !== undefined && strongOk) mapped.push({ ch: subs.strong[c]!, sub: true });
      else if (hasLetter && subs.weak[c] !== undefined && prevOk && nextOk) mapped.push({ ch: subs.weak[c]!, sub: true });
      else if (/[\p{L}\p{N}\p{M}]/u.test(c)) mapped.push({ ch: c, sub: false });
      else mapped.push({ ch: ' ', sub: false });
    }
    i0 = j0;
  }
  // 2) gom thành token thô
  const raw: Array<{ t: string; sub: boolean }> = [];
  let cur = '';
  let curSub = false;
  for (const m of mapped) {
    if (m.ch === ' ') {
      if (cur) raw.push({ t: cur.normalize('NFC'), sub: curSub });
      cur = '';
      curSub = false;
    } else {
      cur += m.ch;
      curSub ||= m.sub;
    }
  }
  if (cur) raw.push({ t: cur.normalize('NFC'), sub: curSub });
  // 3) ghép token 1 ký tự liền nhau
  const tokens: string[] = [];
  const evasive: boolean[] = [];
  let buf = '';
  let bufN = 0;
  let bufSub = false;
  const flush = () => {
    if (!buf) return;
    tokens.push(buf);
    evasive.push(bufSub || bufN >= 2);
    buf = '';
    bufN = 0;
    bufSub = false;
  };
  for (const r of raw) {
    if ([...r.t].length === 1) {
      buf += r.t;
      bufN++;
      bufSub ||= r.sub;
      continue;
    }
    flush();
    tokens.push(r.t);
    evasive.push(r.sub);
  }
  flush();
  // 4) rút gọn chữ lặp (raw giữ tối đa 3 lần lặp để "xxxxxx" vẫn khớp "xxx")
  const rawTokens = tokens.map((t) => t.replace(/(\p{L})\1{3,}/gu, '$1$1$1'));
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const c = collapseRepeats(t);
    if (/(\p{L})\1{2,}/u.test(t)) evasive[i] = true;
    tokens[i] = c;
  }
  return { tokens, raw: rawTokens, evasive };
}

export function tokenize(text: string): string[] {
  return tokenizeDetailed(text).tokens;
}

type Kind = 'word' | 'lach' | 'allow' | 'exact';

interface Pattern {
  word: string;
  kind: Kind;
  tokens: string[]; // có dấu
  plain: string[]; // bỏ dấu
  compact: string; // bỏ dấu, nối liền
  compactMarked: string; // có dấu, nối liền
  hasMark: boolean;
  accentStrict: boolean;
  /** Mẫu tự có chữ lặp ≥ 3 (vd "xxx"): so với token chưa rút gọn, không so không dấu/nén. */
  rawOnly: boolean;
  /** Khoá tra chỉ mục, tính sẵn. */
  keys: { T: string; R: string; L: string; C: string; D: string };
}

function compile(entry: string, unaccentedAlso: Set<string>, subs: Subs = DEFAULT_SUBS): Pattern | null {
  let kind: Kind = 'word';
  let word = entry.trim();
  if (word.startsWith('~')) {
    kind = 'lach';
    word = word.slice(1);
  } else if (word.startsWith('+')) {
    kind = 'allow';
    word = word.slice(1);
  } else if (word.startsWith('=')) {
    kind = 'exact';
    word = word.slice(1);
  }
  const det = tokenizeDetailed(word, subs);
  const rawOnly = det.raw.some((t, i) => t !== det.tokens[i] && /(\p{L})\1{2,}/u.test(t));
  const tokens = rawOnly ? det.raw : det.tokens;
  if (!tokens.length) return null;
  const plain = tokens.map(stripDiacritics);
  const hasMark = tokens.some((t) => VIET_DIACRITIC.test(t));
  const accentStrict = kind === 'word' && tokens.length === 1 && hasMark && !unaccentedAlso.has(plain[0]!);
  return {
    word: entry.trim(),
    kind,
    tokens,
    plain,
    compact: collapseRepeats(plain.join('')),
    compactMarked: collapseRepeats(tokens.join('')),
    hasMark,
    accentStrict,
    rawOnly,
    keys: {
      T: `T|${tokens.join(' ')}`,
      R: `R|${tokens.join(' ')}`,
      L: `${hasMark ? 'U' : 'P'}|${plain.join(' ')}`,
      C: `C|${collapseRepeats(tokens.join(''))}`,
      D: `D|${collapseRepeats(plain.join(''))}`,
    },
  };
}

/** Tìm mọi vị trí bắt đầu mà `needle` khớp `hay` và `ok(i)` đúng với mọi token trong đoạn. */
function seqFind(hay: string[], needle: string[], ok: (i: number) => boolean): number {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (!ok(i + j) || hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

const MAX_SPAN = 8;

/** Dựng chỉ mục mọi đoạn ≤ MAX_SPAN token (bỏ đoạn chứa MASK). */
function buildIndex(t: Text): void {
  const add = (key: string, a: number, b: number) => {
    const arr = t.idx.get(key);
    if (arr) arr.push([a, b]);
    else t.idx.set(key, [[a, b]]);
  };
  const n = t.tokens.length;
  for (let a = 0; a < n; a++) {
    let unmarked = true;
    for (let b = a; b < Math.min(n, a + MAX_SPAN); b++) {
      if (t.tokens[b] === MASK) break;
      if (t.marked[b]) unmarked = false;
      const tok = t.tokens.slice(a, b + 1);
      const pl = t.plain.slice(a, b + 1);
      add(`T|${tok.join(' ')}`, a, b);
      add(`R|${t.raw.slice(a, b + 1).join(' ')}`, a, b);
      add(`P|${pl.join(' ')}`, a, b);
      if (unmarked) add(`U|${pl.join(' ')}`, a, b);
      add(`C|${collapseRepeats(tok.join(''))}`, a, b);
      if (unmarked) add(`D|${collapseRepeats(pl.join(''))}`, a, b);
    }
  }
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
  // "o"/"O" kẹp giữa chữ số coi như số 0 ("09o1234567")
  const t = text.toLowerCase().replace(/o/g, (c, i: number, s: string) => (/\d/.test(s[i - 1] ?? '') || /\d/.test(s[i + 1] ?? '') ? '0' : c));
  if (PHONE_DIGITS_RE.test(t)) return true;
  // Số viết bằng chữ: "không chín một hai ..." – ≥ 9 chữ-số liên tiếp
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

export const DEFAULT_UNACCENTED_ALSO = ['dit', 'dm', 'dmm', 'dcm', 'vcl', 'vkl', 'clm', 'cmm', 'dkm', 'loz', 'cl', 'vl', 'cc', 'dcmm', 'fuck', 'shit', 'bitch'];

export interface FilterConfig {
  /** Danh sách mã hoá: "từ", "~biến thể lách", "+allowlist". */
  words: string[];
  /** Từ cấm 1 âm tiết có dấu nhưng vẫn chặn khi viết không dấu (vd "dit"). */
  unaccentedAlso?: string[];
  /** Bảng thay ký tự bổ sung (vd {"9": "g"}). */
  substitutions?: Record<string, string>;
  adsKeywords?: string[];
  weakAdsKeywords?: string[];
  maxChars?: number;
}

interface Text {
  /** Chỉ mục đoạn: khoá "<không gian>|<chuỗi>" → các khoảng [đầu, cuối] (dựng 1 lần / văn bản). */
  idx: Map<string, Array<[number, number]>>;
  raw: string[];
  tokens: string[];
  plain: string[];
  marked: boolean[];
  evasive: boolean[];
}

export class ContentFilter {
  private patterns: Pattern[] = [];
  private allow: Pattern[] = [];
  private ads: Pattern[] = [];
  private weakAds: Pattern[] = [];
  private maxChars: number;
  private subs: Subs = DEFAULT_SUBS;
  private unaccentedAlso: string[];

  constructor(cfg: FilterConfig) {
    this.maxChars = cfg.maxChars ?? LIMITS.LANTERN_MAX_CHARS;
    this.unaccentedAlso = cfg.unaccentedAlso ?? DEFAULT_UNACCENTED_ALSO;
    if (cfg.substitutions) this.setSubstitutions(cfg.substitutions);
    this.setWords(cfg.words, this.unaccentedAlso);
    const none = new Set<string>();
    const kw = (list: string[]) =>
      list
        .map((w) => compile(w, none))
        .filter((p): p is Pattern => !!p)
        .map((p) => ({ ...p, kind: 'word' as Kind, accentStrict: false }));
    this.ads = kw(cfg.adsKeywords ?? DEFAULT_ADS_KEYWORDS);
    this.weakAds = kw(cfg.weakAdsKeywords ?? DEFAULT_WEAK_ADS_KEYWORDS);
  }

  setSubstitutions(extra: Record<string, string>): void {
    const strong = { ...DEFAULT_STRONG_SUBS };
    const weak = { ...DEFAULT_WEAK_SUBS };
    for (const [k, v] of Object.entries(extra)) {
      if ([...k].length !== 1 || typeof v !== 'string' || !v) continue;
      if (/[\p{N}@$€]/u.test(k)) strong[k] = v;
      else weak[k] = v;
    }
    this.subs = { strong, weak };
  }

  setWords(words: string[], unaccentedAlso: string[] = this.unaccentedAlso): void {
    this.unaccentedAlso = unaccentedAlso;
    const ua = new Set(unaccentedAlso.map((w) => stripDiacritics(w.toLowerCase())));
    const seen = new Set<string>();
    this.patterns = [];
    this.allow = [];
    for (const w of words) {
      const p = compile(w, ua, this.subs);
      if (!p) continue;
      const key = `${p.kind}:${p.tokens.join(' ')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (p.kind === 'allow' ? this.allow : this.patterns).push(p);
    }
  }

  get wordCount(): number {
    return this.patterns.length;
  }

  private prepare(clean: string): Text {
    const { tokens, raw, evasive } = tokenizeDetailed(clean, this.subs);
    const plain = tokens.map(stripDiacritics);
    const marked = tokens.map((t) => VIET_DIACRITIC.test(t));
    const txt: Text = { idx: new Map(), raw, tokens, plain, marked, evasive };
    // Che cụm allowlist (thay bằng MASK để không ghép được với token lân cận).
    // Dạng không dấu của allowlist chỉ áp khi CẢ văn bản không dấu — văn bản có dấu đủ ngữ cảnh
    // ("con ngu ngủ ngon") không được tha nhờ allowlist "con ngủ".
    const textUnmarked = !marked.some(Boolean);
    for (const a of this.allow) {
      for (const [hay, okf] of [
        [txt.tokens, () => true],
        [txt.plain, () => !a.hasMark || textUnmarked],
      ] as Array<[string[], (i: number) => boolean]>) {
        const needle = hay === txt.tokens ? a.tokens : a.plain;
        let i = seqFind(hay, needle, okf);
        while (i >= 0) {
          for (let j = i; j < i + needle.length; j++) {
            txt.tokens[j] = MASK;
            txt.plain[j] = MASK;
          }
          i = seqFind(hay, needle, okf);
        }
      }
    }
    buildIndex(txt);
    return txt;
  }

  private matchOne(p: Pattern, t: Text, useCompact: boolean): boolean {
    const hit = (key: string) => {
      const spans = t.idx.get(key);
      if (!spans) return false;
      if (p.kind !== 'lach') return true;
      // biến thể lách: đoạn khớp phải có ít nhất 1 token mang dấu hiệu lách
      return spans.some(([a, b]) => {
        for (let k = a; k <= b; k++) if (t.evasive[k]) return true;
        return false;
      });
    };
    if (p.rawOnly) return hit(p.keys.R);
    // 1) đúng dấu
    if (hit(p.keys.T)) return true;
    const loose = !p.accentStrict && p.kind !== 'exact';
    // 2) không dấu: từ cấm có dấu chỉ so trên đoạn văn bản không dấu
    if (loose && hit(p.keys.L)) return true;
    // 3) bản nén theo ranh giới token; nén không dấu chỉ ghép token KHÔNG dấu ("dù mà" ≠ "duma")
    if (useCompact && p.compact.length >= 4) {
      if (hit(p.keys.C)) return true;
      if (loose && hit(p.keys.D)) return true;
    }
    return false;
  }

  check(input: string): FilterResult {
    const clean = cleanText(input);
    if (!clean) return { ok: false, reason: 'empty', clean };
    if ([...clean].length > this.maxChars) return { ok: false, reason: 'too_long', clean };

    const t = this.prepare(clean);
    const bad = this.patterns.find((p) => this.matchOne(p, t, true));
    if (bad) return { ok: false, reason: 'banned_word', clean, match: bad.word };
    if (LINK_RE.test(clean) || LINK_RE.test(stripDiacritics(clean))) return { ok: false, reason: 'link', clean };
    if (hasPhone(clean)) return { ok: false, reason: 'phone', clean };
    const ad = this.ads.find((p) => this.matchOne(p, t, false));
    if (ad) return { ok: false, reason: 'ads', clean, match: ad.word };
    const weak = this.weakAds.filter((p) => this.matchOne(p, t, false));
    if (weak.length >= 2) return { ok: false, reason: 'ads', clean, match: weak.map((p) => p.word).join(', ') };
    // spam: một ký tự/âm tiết lặp lại quá nhiều
    if (/(.)\1{9,}/u.test(clean) || (t.tokens.length >= 6 && new Set(t.tokens).size === 1)) return { ok: false, reason: 'spam', clean };
    return { ok: true, clean };
  }
}

export interface ParsedWordList {
  /** Danh sách đã mã hoá ("từ", "~lách", "+allow"). */
  words: string[];
  unaccentedAlso?: string[];
  substitutions?: Record<string, string>;
}

const META_KEYS = new Set(['version', 'phienBan', 'updatedAt', 'capNhat', 'note', 'ghiChu', 'description', 'moTa', '$schema', 'nhom', 'mucDo', 'id']);

/**
 * Đọc danh sách từ cấm từ JSON. Chấp nhận:
 *  - ["a", "b"]
 *  - { "words": [...], "unaccentedAlso": [...] }            (định dạng server/data/banned-words.json)
 *  - { "tuCam": [{ "tu", "bienThe": [], "bienTheLach": [] }], "allowlist": [], "thayKyTu": {} }  (content/tu-cam.json)
 *  - { "<nhóm>": [...] } (gộp mọi mảng chuỗi), [{ "word" | "tu": "a" }]
 */
export function parseWordList(json: unknown): ParsedWordList {
  const words: string[] = [];
  let unaccentedAlso: string[] | undefined;
  let substitutions: Record<string, string> | undefined;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const take = (v: unknown) => {
    if (typeof v === 'string') words.push(v);
    else if (Array.isArray(v)) v.forEach(take);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const w = o.word ?? o.tu ?? o.text ?? o.value;
      if (typeof w === 'string') {
        // Quy ước content/tu-cam.json: "tu" chỉ so trong không gian có dấu → "tu" không dấu (vd "ngu")
        // không được khớp "ngủ"/"ngư". Đánh dấu "=" (exact).
        const isTuCam = typeof o.tu === 'string';
        words.push(isTuCam && !/[^\x00-\x7f]/.test(w) ? `=${w}` : w);
        for (const k of ['variants', 'bienThe', 'aliases']) words.push(...strs(o[k]));
        for (const k of ['bienTheLach', 'evasionOnly']) words.push(...strs(o[k]).map((x) => `~${x}`));
        return;
      }
      for (const [k, val] of Object.entries(o)) {
        if (META_KEYS.has(k)) continue;
        if (k === 'unaccentedAlso') unaccentedAlso = strs(val);
        else if (k === 'allowlist' || k === 'allow' || k === 'ngoaiLe') words.push(...strs(val).map((x) => `+${x}`));
        else if (k === 'thayKyTu' || k === 'substitutions') {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            substitutions = Object.fromEntries(Object.entries(val).filter((e): e is [string, string] => typeof e[1] === 'string'));
          }
        } else take(val);
      }
    }
  };
  take(json);
  return { words: [...new Set(words.map((w) => w.trim()).filter(Boolean))], unaccentedAlso, substitutions };
}
