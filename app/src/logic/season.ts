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
export interface SeasonQuest {
  id: string;
  ten: string;
  moTa: string;
  phanThuong?: string;
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
  nhiemVu?: SeasonQuest[];
}

/** Nghi thức trong app có thể hoàn thành một nhiệm vụ mùa. */
export type QuestRitual = 'meditation' | 'bell' | 'fortune' | 'incense' | 'lantern' | 'mo' | 'beads' | 'bow';

export interface QuestKind {
  /** Ẩn: mô tả thứ app không có (vật phẩm "ảo", Cây nguyện, gửi quà trong app) */
  hidden: boolean;
  /** Tự hoàn thành khi làm nghi thức này trong mùa; null = người chơi tự đánh dấu (việc ngoài đời) */
  ritual: QuestRitual | null;
  /** Thiền: số phút tối thiểu (nhiệm vụ ghi "5 phút" / "năm phút") */
  minMinutes?: number;
}

const RITUAL_WORDS: [RegExp, QuestRitual][] = [
  [/thiền|ngồi yên|ngồi lặng|tĩnh tâm|ngồi (bên .{1,20})?năm phút|thở chậm|meditat|sit (quietly|still)/i, 'meditation'],
  [/xăm|quẻ|fortune stick|verse cup/i, 'fortune'],
  [/thỉnh chuông|ring the bell/i, 'bell'],
  [/thả (một )?(chiếc |ngọn )?đèn hoa đăng|release a (flower )?lantern/i, 'lantern'],
  [/thắp (một )?(nén )?hương|nén hương|incense/i, 'incense'],
  [/gõ mõ|wooden fish/i, 'mo'],
  [/niệm phật|lần chuỗi|chuỗi hạt|108 hạt|prayer beads/i, 'beads'],
];

/** Mô tả thứ app không có: vật phẩm/hoạt động "ảo" khác, Cây nguyện, gửi quà trong app. */
const NOT_IN_APP =
  /(^|[\s,.(])ảo([\s,.:;)]|$)|cây nguyện|trong app|danh sách bạn|trong (sân|vườn) chùa|sổ nhớ ơn|virtual|wish tree|in the app|friends list/i;

/**
 * Phân loại nhiệm vụ mùa của phiên nội dung theo những gì app thật sự có. Khớp nghi thức được xét TRƯỚC
 * (vd. "thả một chiếc đèn hoa đăng ảo" chính là thả đèn trong app); còn lại nếu nói tới thứ app không có thì ẩn.
 */
export function classifyQuest(q: SeasonQuest): QuestKind {
  const text = `${q.ten} ${q.moTa}`;
  if (!/cây nguyện|wish tree/i.test(text)) {
    for (const [re, ritual] of RITUAL_WORDS) {
      if (!re.test(text)) continue;
      if (ritual === 'meditation') return { hidden: false, ritual, minMinutes: /(5|năm|five) (phút|minutes)/i.test(text) ? 5 : 1 };
      return { hidden: false, ritual };
    }
  }
  if (NOT_IN_APP.test(text)) return { hidden: true, ritual: null };
  return { hidden: false, ritual: null };
}

/** Khóa lưu tiến độ: theo mùa + năm âm lịch, để mùa năm sau làm lại được. */
export function questKey(seasonId: string, lunarYear: number, questId: string): string {
  return `${seasonId}:${lunarYear}:${questId}`;
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

/** Năm âm lịch của ngày BẮT ĐẦU mùa (mùa Tết 23/12 → 15/1: phần tháng Giêng vẫn tính năm bắt đầu). */
export function seasonYear(season: Pick<Season, 'khoangNgayAm'>, lunar: { month: number; day: number; year: number }): number {
  const { tu, den } = season.khoangNgayAm;
  const wraps = tu.thang * 100 + tu.ngay > den.thang * 100 + den.ngay;
  const inNewYearPart = wraps && lunar.month * 100 + lunar.day <= den.thang * 100 + den.ngay;
  return inNewYearPart ? lunar.year - 1 : lunar.year;
}
