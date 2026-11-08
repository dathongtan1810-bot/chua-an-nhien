import { dayDiff, addDays, weekKey } from './dates';

export interface Streak {
  lastDay: string | null;
  count: number;
  best: number;
  /** Tuần (khóa thứ Hai) đã dùng ngày nghỉ miễn trừ. */
  restWeeks: string[];
}

export const emptyStreak = (): Streak => ({ lastDay: null, count: 0, best: 0, restWeeks: [] });

/**
 * Ghi nhận một lần viếng chùa vào ngày `today`.
 * Mỗi tuần (thứ Hai–Chủ nhật) được nghỉ 1 ngày mà không mất chuỗi; ngày nghỉ không được cộng.
 */
export function visit(s: Streak, today: string): Streak {
  if (s.lastDay === today) return s;
  let count = 1;
  let restWeeks = s.restWeeks;
  if (s.lastDay) {
    const gap = dayDiff(s.lastDay, today);
    if (gap === 1) count = s.count + 1;
    else if (gap === 2) {
      const missed = addDays(s.lastDay, 1);
      const wk = weekKey(missed);
      if (!restWeeks.includes(wk)) {
        count = s.count + 1;
        restWeeks = [...restWeeks, wk].slice(-8);
      }
    } else if (gap < 0) return s; // đồng hồ lùi: bỏ qua
  }
  return { lastDay: today, count, best: Math.max(s.best, count), restWeeks };
}

/** Chuỗi hiện tại nhìn từ hôm nay (nếu đã đứt thì hiển thị 0). */
export function currentStreak(s: Streak, today: string): number {
  if (!s.lastDay) return 0;
  const gap = dayDiff(s.lastDay, today);
  if (gap <= 1) return s.count;
  if (gap === 2 && !s.restWeeks.includes(weekKey(addDays(s.lastDay, 1)))) return s.count;
  return 0;
}
