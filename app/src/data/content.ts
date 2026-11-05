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

export function getQueXam(): QueXam[] {
  return load('que-xam', sampleQueXam, isQueXam).items;
}
export function getThongDiep(): ThongDiep[] {
  return load('thong-diep-ngay', sampleThongDiep, isThongDiep).items;
}
export function getSuKien(): SuKien[] {
  return load('su-kien-am-lich', sampleSuKien, isSuKien).items;
}
export function getLoiNguyenMau(): LoiNguyenMau[] {
  return load('loi-nguyen-mau', sampleLoiNguyen, isLoiNguyenMau).items;
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
