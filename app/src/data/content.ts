/**
 * Content loader. Prefers JSON files supplied by the content team in `<repo>/content/*.json`
 * (que-xam.json, thong-diep-ngay.json, su-kien-am-lich.json, loi-nguyen-mau.json) and falls back
 * to the bundled samples in this folder. Every entry is validated at runtime; invalid entries are
 * dropped, and if nothing valid remains the sample is used instead.
 */
import sampleQueXam from './sample-que-xam.json';
import sampleThongDiep from './sample-thong-diep-ngay.json';
import sampleSuKien from './sample-su-kien-am-lich.json';
import sampleLoiNguyen from './sample-loi-nguyen-mau.json';
import { getLang } from '../core/i18n';
import { isSeason, type Season } from '../logic/season';

export interface QueXam {
  id: number;
  tieuDe: string;
  tho: string;
  loiGiai: string;
  loiGiaiTheoChuDe: Record<string, string>;
  loiKhuyen: string;
  chuDe: string[];
}

export interface ThongDiep {
  id: number;
  noiDung: string;
}

export interface SuKien {
  ten: string;
  /** Lunar month 1–12; 0 = every month. */
  thang: number;
  /** Lunar day 1–30. */
  ngay: number;
  moTa: string;
  /** Comma-separated decoration tokens, e.g. "den-long,hoa-sen". */
  trangTri: string;
  nhiemVu: string;
}

export interface LoiNguyenMau {
  chuDe: string;
  noiDung: string;
}

export type ContentKey = 'que-xam' | 'thong-diep-ngay' | 'su-kien-am-lich' | 'loi-nguyen-mau';
export type ContentOrigin = 'content' | 'sample';

type Validator<T> = (x: unknown) => x is T;

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
function isStr(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}
function isInt(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x);
}

export const isQueXam: Validator<QueXam> = (x): x is QueXam => {
  if (!isObj(x)) return false;
  if (!isInt(x.id) || !isStr(x.tieuDe) || !isStr(x.tho) || !isStr(x.loiGiai) || !isStr(x.loiKhuyen)) {
    return false;
  }
  if (!Array.isArray(x.chuDe) || !x.chuDe.every(isStr)) return false;
  const byTopic = x.loiGiaiTheoChuDe;
  if (!isObj(byTopic) || !Object.values(byTopic).every(isStr)) return false;
  return true;
};

export const isThongDiep: Validator<ThongDiep> = (x): x is ThongDiep =>
  isObj(x) && isInt(x.id) && isStr(x.noiDung);

export const isSuKien: Validator<SuKien> = (x): x is SuKien =>
  isObj(x) &&
  isStr(x.ten) &&
  isInt(x.thang) &&
  x.thang >= 0 &&
  x.thang <= 12 &&
  isInt(x.ngay) &&
  x.ngay >= 1 &&
  x.ngay <= 30 &&
  typeof x.moTa === 'string' &&
  typeof x.trangTri === 'string' &&
  typeof x.nhiemVu === 'string';

export const isLoiNguyenMau: Validator<LoiNguyenMau> = (x): x is LoiNguyenMau =>
  isObj(x) && isStr(x.chuDe) && isStr(x.noiDung);

export interface Picked<T> {
  items: T[];
  source: ContentOrigin;
}

/** Pure: keep valid entries of `external`; if none (or not an array), use `sample`. */
export function pickContent<T>(external: unknown, sample: T[], validate: (x: unknown) => boolean): Picked<T> {
  if (Array.isArray(external)) {
    const valid = external.filter((x) => validate(x)) as T[];
    if (valid.length > 0) return { items: valid, source: 'content' };
  }
  return { items: sample, source: 'sample' };
}

// Vite resolves this at build/test time; missing folder → empty object.
const externalFiles = import.meta.glob('../../../content/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function findExternal(name: ContentKey): unknown {
  const suffix = `/${name}.json`;
  for (const [path, value] of Object.entries(externalFiles)) {
    if (path.endsWith(suffix)) return value;
  }
  return undefined;
}

const cache = new Map<ContentKey, Picked<unknown>>();

/** Từ khóa mô tả trang trí (phiên nội dung viết văn xuôi) → token hiệu ứng của app. */
const DECOR_KEYWORDS: [RegExp, string][] = [
  [/đèn lồng|lồng đèn/i, 'den-long'],
  [/sen/i, 'hoa-sen'],
  [/hoa hồng/i, 'hoa-hong'],
  [/trăng/i, 'trang-ram'],
  [/đào|mai/i, 'hoa-dao-mai'],
  [/pháo/i, 'phao-hoa-nhe'],
  [/cờ|phướn/i, 'co-phuon'],
];

/**
 * Chuẩn hóa dữ liệu của phiên nội dung về schema app:
 * - que-xam: `tho` có thể là mảng dòng → nối bằng "\n"
 * - su-kien: `thang` null = hằng tháng (0); `trangTri`/`nhiemVu` có thể là danh sách mô tả
 */
export function normalizeExternal(name: ContentKey, list: unknown): unknown {
  if (!Array.isArray(list)) return list;
  return list.map((x) => {
    if (!isObj(x)) return x;
    if (name === 'que-xam' && Array.isArray(x.tho)) return { ...x, tho: x.tho.join('\n') };
    if (name === 'su-kien-am-lich') {
      const o: Record<string, unknown> = { ...x };
      if (o.thang === null || o.thang === undefined) o.thang = 0;
      if (Array.isArray(o.trangTri)) {
        const text = o.trangTri.join(' ');
        o.trangTri = DECOR_KEYWORDS.filter(([re]) => re.test(text)).map(([, tok]) => tok).join(',');
      }
      if (Array.isArray(o.nhiemVu)) o.nhiemVu = String(o.nhiemVu[0] ?? '');
      return o;
    }
    return x;
  });
}

function load<T>(name: ContentKey, sample: unknown, validate: Validator<T>): Picked<T> {
  let hit = cache.get(name);
  if (!hit) {
    const safeSample = Array.isArray(sample) ? sample.filter((x) => validate(x)) : [];
    hit = pickContent<unknown>(normalizeExternal(name, findExternal(name)), safeSample, validate);
    cache.set(name, hit);
  }
  return hit as Picked<T>;
}

// ---------- Bản tiếng Anh (content/i18n/en, cùng id & schema) — tải lười khi chọn English ----------
const enLoaders = import.meta.glob('../../../content/i18n/en/*.json', { import: 'default' }) as Record<
  string,
  () => Promise<unknown>
>;
const enCache = new Map<ContentKey, unknown[]>();
let enLoad: Promise<void> | null = null;

const VALIDATORS: Record<ContentKey, Validator<unknown>> = {
  'que-xam': isQueXam,
  'thong-diep-ngay': isThongDiep,
  'su-kien-am-lich': isSuKien,
  'loi-nguyen-mau': isLoiNguyenMau,
};

/**
 * Ghép bản tiếng Anh. Sự kiện: giữ ngày/tháng và token trang trí của bản tiếng Việt cùng `id`
 * (từ khóa trang trí là tiếng Việt), chỉ lấy chữ (ten, moTa, nhiemVu) từ bản tiếng Anh.
 */
export function buildEnglish(name: ContentKey, raw: unknown, vi: readonly unknown[]): unknown[] {
  let list = normalizeExternal(name, raw);
  if (!Array.isArray(list)) return [];
  if (name === 'su-kien-am-lich') {
    const byId = new Map<unknown, Record<string, unknown>>();
    for (const v of vi) if (isObj(v) && v.id !== undefined) byId.set(v.id, v);
    list = list.map((x) => {
      const v = isObj(x) ? byId.get(x.id) : undefined;
      return v && isObj(x) ? { ...v, ten: x.ten, moTa: x.moTa, nhiemVu: x.nhiemVu } : x;
    });
  }
  return (list as unknown[]).filter((x) => VALIDATORS[name](x));
}

/** Tải nội dung theo ngôn ngữ (chỉ 'en' cần tải thêm). Gọi lại an toàn. */
export function loadLangContent(lang: string): Promise<void> {
  if (lang !== 'en') return Promise.resolve();
  enLoad ??= (async () => {
    const vis: Record<ContentKey, unknown[]> = {
      'que-xam': getQueXamVi(),
      'thong-diep-ngay': load('thong-diep-ngay', sampleThongDiep, isThongDiep).items,
      'su-kien-am-lich': load('su-kien-am-lich', sampleSuKien, isSuKien).items,
      'loi-nguyen-mau': load('loi-nguyen-mau', sampleLoiNguyen, isLoiNguyenMau).items,
    };
    await loadSeasonsEn();
    const ui = Object.entries(enLoaders).find(([path]) => path.endsWith('/giao-dien.json'));
    if (ui) {
      try {
        const raw = await ui[1]();
        if (isStringDict(raw)) uiEn = raw;
      } catch {
        /* dùng chữ của app */
      }
    }
    for (const name of Object.keys(VALIDATORS) as ContentKey[]) {
      const entry = Object.entries(enLoaders).find(([path]) => path.endsWith(`/${name}.json`));
      if (!entry) continue;
      try {
        const items = buildEnglish(name, await entry[1](), vis[name]);
        if (items.length) enCache.set(name, items);
      } catch {
        /* thiếu / lỗi → dùng tiếng Việt */
      }
    }
  })();
  return enLoad;
}

// ---------- Bộ mùa (content/mua/*.json + i18n/en/mua/*.json) ----------
const seasonFiles = import.meta.glob(['../../../content/mua/*.json', '!../../../content/mua/*.schema.json'], {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const seasonEnLoaders = import.meta.glob('../../../content/i18n/en/mua/*.json', { import: 'default' }) as Record<
  string,
  () => Promise<unknown>
>;
let seasonsEn: Season[] = [];

/** Các bộ mùa theo ngôn ngữ hiện tại (tiếng Anh có sau loadSeasonsEn; thiếu thì dùng tiếng Việt). */
export function getSeasons(): Season[] {
  const vi = Object.values(seasonFiles).filter(isSeason);
  if (getLang() !== 'en' || !seasonsEn.length) return vi;
  // bản EN giữ khoảng ngày của bản VI cùng id
  return seasonsEn.map((e) => ({ ...e, khoangNgayAm: vi.find((v) => v.id === e.id)?.khoangNgayAm ?? e.khoangNgayAm }));
}

async function loadSeasonsEn(): Promise<void> {
  const out: Season[] = [];
  for (const load of Object.values(seasonEnLoaders)) {
    try {
      const raw = await load();
      if (isSeason(raw)) out.push(raw);
    } catch {
      /* bỏ qua */
    }
  }
  seasonsEn = out;
}

/** Từ khóa mô tả trang trí (văn xuôi) → token hiệu ứng của app. */
export function decorTokensFromText(texts: readonly string[]): string[] {
  const text = texts.join(' ');
  return DECOR_KEYWORDS.filter(([re]) => re.test(text)).map(([, tok]) => tok);
}

// ---------- Lời thông báo nhắc (content/thong-bao-day.json + bản EN) ----------
export interface ThongBao {
  id: string;
  loai: string;
  tieuDe: string;
  noiDung: string;
}
const isThongBao = (x: unknown): x is ThongBao =>
  isObj(x) && typeof x.id === 'string' && typeof x.loai === 'string' && isStr(x.tieuDe) && isStr(x.noiDung);
/** App không có "Cây nguyện" (dùng dòng sông thả đèn) → bỏ các câu nhắc tới nó. */
const mentionsWishTree = (b: ThongBao) => /cây nguyện|wish tree/i.test(b.tieuDe + ' ' + b.noiDung);

/** Lời nhắc của phiên nội dung theo ngôn ngữ (rỗng nếu chưa có file). */
export async function getThongBao(lang: string): Promise<ThongBao[]> {
  let raw: unknown = Object.entries(externalFiles).find(([p]) => p.endsWith('/thong-bao-day.json'))?.[1];
  if (lang === 'en') {
    const en = Object.entries(enLoaders).find(([p]) => p.endsWith('/thong-bao-day.json'));
    if (en) {
      try {
        raw = await en[1]();
      } catch {
        /* giữ bản tiếng Việt */
      }
    }
  }
  return Array.isArray(raw) ? raw.filter(isThongBao).filter((b) => !mentionsWishTree(b)) : [];
}

// ---------- Chữ giao diện (content/giao-dien.json + i18n/en/giao-dien.json) ----------
const isStringDict = (x: unknown): x is Record<string, string> =>
  isObj(x) && Object.values(x).every((v) => typeof v === 'string');
let uiEn: Record<string, string> = {};

/** Chữ giao diện tiếng Việt của phiên nội dung (rỗng nếu chưa có file). */
export function uiStringsVi(): Record<string, string> {
  const ext = Object.entries(externalFiles).find(([p]) => p.endsWith('/giao-dien.json'))?.[1];
  return isStringDict(ext) ? ext : {};
}
/** Chữ giao diện tiếng Anh — có sau khi loadLangContent('en'). */
export function uiStringsEn(): Record<string, string> {
  return uiEn;
}

function pickLang<T>(name: ContentKey, vi: T[]): T[] {
  return getLang() === 'en' ? ((enCache.get(name) as T[] | undefined) ?? vi) : vi;
}

function getQueXamVi(): QueXam[] {
  return load('que-xam', sampleQueXam, isQueXam).items;
}
export function getQueXam(): QueXam[] {
  return pickLang('que-xam', getQueXamVi());
}
export function getThongDiep(): ThongDiep[] {
  return pickLang('thong-diep-ngay', load('thong-diep-ngay', sampleThongDiep, isThongDiep).items);
}
export function getSuKien(): SuKien[] {
  return pickLang('su-kien-am-lich', load('su-kien-am-lich', sampleSuKien, isSuKien).items);
}
export function getLoiNguyenMau(): LoiNguyenMau[] {
  return pickLang('loi-nguyen-mau', load('loi-nguyen-mau', sampleLoiNguyen, isLoiNguyenMau).items);
}

/** Which source each content file was taken from. */
export function contentSource(): Record<ContentKey, ContentOrigin> {
  return {
    'que-xam': load('que-xam', sampleQueXam, isQueXam).source,
    'thong-diep-ngay': load('thong-diep-ngay', sampleThongDiep, isThongDiep).source,
    'su-kien-am-lich': load('su-kien-am-lich', sampleSuKien, isSuKien).source,
    'loi-nguyen-mau': load('loi-nguyen-mau', sampleLoiNguyen, isLoiNguyenMau).source,
  };
}
