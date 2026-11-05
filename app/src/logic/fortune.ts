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

export function topicLabel(id: string, lang: 'vi' | 'en'): string {
  const t = TOPICS.find((x) => x.id === id);
  return t ? t[lang] : id;
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
