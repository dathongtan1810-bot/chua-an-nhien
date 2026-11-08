/** Hàm thuần cho nghi thức thắp hương & gõ mõ (test được không cần Phaser). */

/** Độ đều nhịp: hệ số biến thiên của các khoảng cách gần nhất (0 = đều tuyệt đối). */
export function rhythmVariation(intervals: number[]): number {
  if (intervals.length < 2) return 1;
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean <= 0) return 1;
  const v = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  return Math.sqrt(v) / mean;
}

/** Nhịp "đều" khi ≥ 8 khoảng gần nhất lệch < 12% và tempo trong 40–160 nhịp/phút. */
export function isSteady(intervals: number[]): boolean {
  const last = intervals.slice(-8);
  if (last.length < 8) return false;
  const mean = last.reduce((a, b) => a + b, 0) / last.length;
  return rhythmVariation(last) < 0.12 && mean >= 375 && mean <= 1500;
}

/** Tỉ lệ hương còn lại (1 → 0) sau `elapsedMs` với thời gian cháy `burnMs`. */
export function incenseRemaining(elapsedMs: number, burnMs: number): number {
  return Math.max(0, Math.min(1, 1 - elapsedMs / burnMs));
}

/** Đã kéo bó hương vào trong lư chưa. */
export function insideBurner(x: number, y: number, bx: number, by: number, r: number): boolean {
  return (x - bx) ** 2 + (y - by) ** 2 <= r * r;
}
