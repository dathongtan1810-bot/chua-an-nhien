import { decorTokensFromText, getSeasons, getSuKien, getThongDiep, type SuKien } from '../data/content';
import { activeSeason, type Season } from '../logic/season';
import { fnv1a } from '../logic/fortune';
import { decorationsFor, eventsForLunarDate } from '../logic/lunarEvents';
import { vnDateKey, vnHour } from '../logic/dates';
import { lunarMonthLength, solarToLunar, type LunarDate } from '../lunar/lunar';
import type { RitualKind } from './state';

export interface TodayInfo {
  dateKey: string;
  hour: number;
  lunar: LunarDate;
  events: SuKien[];
  decorations: string[];
  message: string;
  /** Nghi thức hoàn thành nhiệm vụ sự kiện hôm nay (null nếu không có sự kiện). */
  eventRitual: RitualKind | 'any' | null;
  fullMoon: boolean;
  /** Bộ mùa đang diễn ra (content/mua), nếu có */
  season: Season | null;
}

/** Suy ra nghi thức cần làm từ mô tả nhiệm vụ sự kiện. */
export function eventRitualFor(nhiemVu: string): RitualKind | 'any' {
  const s = nhiemVu.toLowerCase();
  if (s.includes('đèn')) return 'lantern';
  if (s.includes('hương')) return 'incense';
  if (s.includes('chuông')) return 'bell';
  if (s.includes('thiền')) return 'meditation';
  if (s.includes('chuỗi') || s.includes('niệm')) return 'beads';
  if (s.includes('xăm')) return 'fortune';
  return 'any';
}

/** Ngày giả lập cho QA/xem trước sự kiện (`?date=2026-02-17`). */
let forcedNow: number | null = null;
export function setForcedDate(iso: string | null): void {
  const t = iso ? Date.parse(iso + 'T05:00:00Z') : NaN;
  forcedNow = Number.isFinite(t) ? t : null;
}

export function todayInfo(now: Date | number = forcedNow ?? Date.now()): TodayInfo {
  const dateKey = vnDateKey(now);
  const [y, m, d] = dateKey.split('-').map(Number);
  const lunar = solarToLunar(d, m, y);
  let len: 29 | 30 = 30;
  try {
    len = lunarMonthLength(lunar.month, lunar.year, lunar.leap);
  } catch {
    /* giữ 30 */
  }
  const events = eventsForLunarDate(getSuKien(), lunar, len)
    // sự kiện năm (thang > 0) lên trước sự kiện hằng tháng
    .sort((a, b) => (b.thang > 0 ? 1 : 0) - (a.thang > 0 ? 1 : 0));
  const season = activeSeason(getSeasons(), lunar);
  // trong mùa: thông điệp của mùa; ngoài mùa: thông điệp ngày chung
  const msgs = season?.thongDiep.length ? season.thongDiep : getThongDiep();
  const message = msgs.length ? msgs[fnv1a(dateKey) % msgs.length].noiDung : '';
  const main = events[0];
  return {
    dateKey,
    hour: vnHour(now),
    lunar,
    events,
    decorations: [...new Set([...decorationsFor(events), ...(season ? decorTokensFromText(season.trangTri) : [])])],
    message,
    eventRitual: main ? eventRitualFor(main.nhiemVu) : null,
    fullMoon: lunar.day >= 14 && lunar.day <= 16,
    season,
  };
}
