/**
 * Fortune sticks (quẻ xăm). Results are reflective and for reference only (mang tính chiêm nghiệm,
 * tham khảo). Drawing is deterministic per (deviceId, topic, dateKey) so asking the same topic again
 * on the same day shows the same stick.
 */
import type { QueXam } from '../data/content';

export interface Topic {
  id: string;
  vi: string;
  en: string;
}

export const TOPICS: readonly Topic[] = [
  { id: 'binh-an', vi: 'Bình an', en: 'Peace' },
  { id: 'gia-dao', vi: 'Gia đạo', en: 'Family' },
  { id: 'cong-danh', vi: 'Công danh', en: 'Career' },
  { id: 'hoc-tap', vi: 'Học tập', en: 'Studies' },
  { id: 'suc-khoe', vi: 'Sức khỏe', en: 'Health' },
  { id: 'tinh-duyen', vi: 'Tình duyên', en: 'Love' },
] as const;

/**
 * Nhãn của mọi mã chủ đề đã biết. Mã chung với phiên nội dung (content/DECISIONS D6):
 * gia-dao, cong-viec, suc-khoe, hoc-hanh, tinh-duyen, tai-loc ("Làm ăn" — D35). Các mã còn lại là của dữ liệu mẫu.
 */
const KNOWN_TOPICS: Record<string, { vi: string; en: string }> = {
  'gia-dao': { vi: 'Gia đạo', en: 'Family' },
  'cong-viec': { vi: 'Công việc', en: 'Work' },
  'suc-khoe': { vi: 'Sức khỏe', en: 'Health' },
  'hoc-hanh': { vi: 'Học hành', en: 'Study' },
  'tinh-duyen': { vi: 'Tình duyên', en: 'Love' },
  'tai-loc': { vi: 'Làm ăn', en: 'Livelihood' },
  mua: { vi: 'Quẻ của mùa', en: 'Seasonal verse' },
  ...Object.fromEntries(TOPICS.map((t) => [t.id, { vi: t.vi, en: t.en }])),
};
const TOPIC_ORDER = ['gia-dao', 'cong-viec', 'suc-khoe', 'hoc-hanh', 'tinh-duyen', 'tai-loc', 'binh-an', 'cong-danh', 'hoc-tap'];

/** Mã chủ đề đặc biệt: quẻ của mùa đang diễn ra (content/mua/*.json → queDacBiet). */
export const SEASON_TOPIC = 'mua';

/** Đổi quẻ đặc biệt của mùa sang dạng QueXam (không có lời giải theo chủ đề). */
export function seasonSticksAsQueXam(
  sticks: readonly { id: string; tieuDe: string; tho: string[] | string; loiGiai: string; loiKhuyen: string }[],
): QueXam[] {
  return sticks.map((s, i) => ({
    id: 1001 + i,
    tieuDe: s.tieuDe,
    tho: Array.isArray(s.tho) ? s.tho.join('\n') : s.tho,
    loiGiai: s.loiGiai,
    loiGiaiTheoChuDe: {},
    loiKhuyen: s.loiKhuyen,
    chuDe: [SEASON_TOPIC],
  }));
}

export function topicLabel(id: string, lang: 'vi' | 'en'): string {
  return KNOWN_TOPICS[id]?.[lang] ?? id;
}

/**
 * Chủ đề thật sự có trong bộ quẻ đang dùng (theo `loiGiaiTheoChuDe` và `chuDe`), để mỗi chủ đề
 * người chơi chọn đều có quẻ và lời giải riêng — không cố định danh sách.
 */
export function availableTopics(list: readonly QueXam[]): Topic[] {
  const ids = new Set<string>();
  for (const q of list) {
    q.chuDe.forEach((c) => ids.add(c));
    Object.keys(q.loiGiaiTheoChuDe).forEach((c) => ids.add(c));
  }
  const rank = (id: string) => {
    const i = TOPIC_ORDER.indexOf(id);
    return i < 0 ? TOPIC_ORDER.length : i;
  };
  return [...ids]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((id) => ({ id, vi: topicLabel(id, 'vi'), en: topicLabel(id, 'en') }));
}

/** 32-bit FNV-1a hash of a string (UTF-16 code units). */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG → floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PickFortuneOptions {
  deviceId: string;
  topic: string;
  /** YYYY-MM-DD in Vietnam time. */
  dateKey: string;
  /** Override the seeded PRNG (tests / special modes). */
  rand?: () => number;
}

/**
 * Pick a stick. Prefers sticks that cover `topic`; falls back to the full list.
 * Throws if the list is empty.
 */
export function pickFortune(list: readonly QueXam[], opts: PickFortuneOptions): QueXam {
  if (list.length === 0) throw new Error('pickFortune: empty list');
  const matching = list.filter((q) => q.chuDe.includes(opts.topic));
  const pool = matching.length > 0 ? matching : list;
  const rand = opts.rand ?? mulberry32(fnv1a(`${opts.deviceId}|${opts.topic}|${opts.dateKey}`));
  const r = rand();
  const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(r * pool.length)));
  return pool[idx];
}

export interface FortuneHistoryEntry {
  topic: string;
  dateKey: string;
}

/** One stick per topic per day. */
export function canAskToday(history: readonly FortuneHistoryEntry[], topic: string, dateKey: string): boolean {
  return !history.some((h) => h.topic === topic && h.dateKey === dateKey);
}

/** The stick number shown to the user (its id). */
export function stickNumber(q: QueXam): number {
  return q.id;
}

/** Interpretation for a topic, falling back to the general interpretation. */
export function interpretationFor(q: QueXam, topic: string): string {
  return q.loiGiaiTheoChuDe[topic] ?? q.loiGiai;
}
