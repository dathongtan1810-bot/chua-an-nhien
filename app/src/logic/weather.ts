import { fnv1a } from './fortune';

/**
 * Mưa phùn xuân kiểu Bắc Bộ: tháng Giêng–tháng Ba âm lịch, khoảng 45% số ngày,
 * chọn cố định theo ngày (mọi người cùng thấy một thời tiết).
 */
export function isDrizzleDay(lunarMonth: number, dateKey: string): boolean {
  if (lunarMonth < 1 || lunarMonth > 3) return false;
  return fnv1a('mua-phun:' + dateKey) % 100 < 45;
}
