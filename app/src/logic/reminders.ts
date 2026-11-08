import { leapMonthOf, lunarToSolar, solarToLunar } from '../lunar/lunar';
import { parseDateKey } from './dates';

export interface LunarReminder {
  /** Ngày dương (YYYY-MM-DD, giờ VN) */
  dateKey: string;
  kind: 'mung-1' | 'ram';
  lunarMonth: number;
  leap: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Các ngày mùng 1 và rằm (15) âm lịch sắp tới, kể từ `fromKey` (tính cả hôm nay), theo thứ tự.
 * Có tính tháng nhuận.
 */
export function nextLunarReminders(fromKey: string, count: number): LunarReminder[] {
  const { day, month, year } = parseDateKey(fromKey);
  const start = solarToLunar(day, month, year);
  const out: LunarReminder[] = [];
  let lYear = start.year;
  let lMonth = start.month;
  let leap = start.leap;
  for (let guard = 0; out.length < count && guard < 60; guard++) {
    for (const [d, kind] of [
      [1, 'mung-1'],
      [15, 'ram'],
    ] as const) {
      const s = lunarToSolar(d, lMonth, lYear, leap);
      if (!s) continue;
      const key = `${s.year}-${pad(s.month)}-${pad(s.day)}`;
      if (key >= fromKey && out.length < count) out.push({ dateKey: key, kind, lunarMonth: lMonth, leap });
    }
    // tháng kế tiếp: tháng nhuận (nếu năm có nhuận đúng tháng này) rồi mới sang tháng sau
    if (!leap && leapMonthOf(lYear) === lMonth) leap = true;
    else {
      leap = false;
      lMonth += 1;
      if (lMonth > 12) {
        lMonth = 1;
        lYear += 1;
      }
    }
  }
  return out;
}

/** Thời điểm nhắc: 6:30 sáng giờ Việt Nam của ngày đó. */
export function reminderTime(dateKey: string): Date {
  return new Date(`${dateKey}T06:30:00+07:00`);
}
