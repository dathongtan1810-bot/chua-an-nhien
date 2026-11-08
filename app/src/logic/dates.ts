/** Tiện ích ngày theo giờ Việt Nam (UTC+7), độc lập múi giờ máy. */
const VN_OFFSET_MS = 7 * 3600 * 1000;

export function vnDateKey(now: Date | number = Date.now()): string {
  const t = typeof now === 'number' ? now : now.getTime();
  return new Date(t + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function vnHour(now: Date | number = Date.now()): number {
  const t = typeof now === 'number' ? now : now.getTime();
  const d = new Date(t + VN_OFFSET_MS);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

/** Số ngày giữa 2 dateKey (b - a). */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(key + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
}

/** Khóa tuần: ngày thứ Hai của tuần chứa key. */
export function weekKey(key: string): string {
  const d = new Date(key + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7; // 0 = thứ Hai
  return addDays(key, -dow);
}

export function parseDateKey(key: string): { day: number; month: number; year: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { day: d, month: m, year: y };
}
