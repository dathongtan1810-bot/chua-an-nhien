import type { SuKien } from '../data/content';

export interface LunarDayRef {
  day: number;
  month: number;
  leap: boolean;
}

/**
 * Events falling on a lunar date.
 * - `thang: 0` events (mùng 1, rằm) apply every month, including leap months.
 * - Annual events never apply in a leap month.
 * - An event on day 30 of month 12 (Giao thừa) matches the last day of month 12 even when it has 29 days.
 */
export function eventsForLunarDate(list: readonly SuKien[], lunar: LunarDayRef, monthLength: 29 | 30): SuKien[] {
  const isLastDay = lunar.day === monthLength;
  return list.filter((ev) => {
    if (ev.thang !== 0) {
      if (lunar.leap || ev.thang !== lunar.month) return false;
    }
    if (ev.ngay === lunar.day) return true;
    // Last-day-of-year event on a short month 12.
    return ev.thang === 12 && ev.ngay === 30 && monthLength === 29 && isLastDay;
  });
}

/** Unique decoration tokens from all events, in first-seen order. */
export function decorationsFor(events: readonly SuKien[]): string[] {
  const out: string[] = [];
  for (const ev of events) {
    for (const raw of ev.trangTri.split(',')) {
      const tok = raw.trim();
      if (tok && !out.includes(tok)) out.push(tok);
    }
  }
  return out;
}
