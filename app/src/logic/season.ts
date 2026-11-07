/** Bộ nội dung theo mùa của phiên nội dung (content/mua/*.json). */
export interface LunarMD {
  thang: number;
  ngay: number;
}
export interface SeasonStick {
  id: string;
  tieuDe: string;
  tho: string[] | string;
  loiGiai: string;
  loiKhuyen: string;
}
export interface Season {
  id: string;
  ten: string;
  khoangNgayAm: { tu: LunarMD; den: LunarMD };
  moTa: string;
  loiChao: { id: number; noiDung: string }[];
  thongDiep: { id: number; noiDung: string }[];
  loiNguyen: { id: number; noiDung: string }[];
  trangTri: string[];
  queDacBiet: SeasonStick[];
}

const key = (m: number, d: number) => m * 100 + d;

/** Ngày âm (tháng, ngày) có nằm trong khoảng không — khoảng có thể vắt qua năm (vd. 23/12 → 15/1). */
export function inLunarRange(month: number, day: number, r: { tu: LunarMD; den: LunarMD }): boolean {
  const k = key(month, day);
  const a = key(r.tu.thang, r.tu.ngay);
  const b = key(r.den.thang, r.den.ngay);
  return a <= b ? k >= a && k <= b : k >= a || k <= b;
}

/** Độ dài khoảng (số "ngày" xấp xỉ, tháng = 30) để chọn mùa cụ thể hơn khi chồng nhau. */
function rangeLength(r: { tu: LunarMD; den: LunarMD }): number {
  const a = (r.tu.thang - 1) * 30 + r.tu.ngay;
  const b = (r.den.thang - 1) * 30 + r.den.ngay;
  return b >= a ? b - a : 360 - a + b;
}

/** Mùa đang diễn ra (mùa có khoảng ngắn nhất nếu nhiều mùa chồng nhau), hoặc null. */
export function activeSeason(list: readonly Season[], lunar: { month: number; day: number }): Season | null {
  const hits = list.filter((s) => inLunarRange(lunar.month, lunar.day, s.khoangNgayAm));
  if (!hits.length) return null;
  return hits.sort((x, y) => rangeLength(x.khoangNgayAm) - rangeLength(y.khoangNgayAm))[0];
}

export const isSeason = (x: unknown): x is Season => {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<Season>;
  const md = (v: unknown) => !!v && typeof (v as LunarMD).thang === 'number' && typeof (v as LunarMD).ngay === 'number';
  return (
    typeof s.id === 'string' &&
    typeof s.ten === 'string' &&
    !!s.khoangNgayAm &&
    md(s.khoangNgayAm.tu) &&
    md(s.khoangNgayAm.den) &&
    Array.isArray(s.loiChao) &&
    Array.isArray(s.thongDiep) &&
    Array.isArray(s.loiNguyen) &&
    Array.isArray(s.trangTri) &&
    Array.isArray(s.queDacBiet)
  );
};
