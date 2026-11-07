/** Ngày thống kê theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD. */
export function vnDay(ms: number = Date.now()): string {
  return new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);
}
export const iso = (ms: number) => new Date(ms).toISOString();
