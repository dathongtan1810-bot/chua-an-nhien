import { describe, expect, it } from 'vitest';
import { nextLunarReminders, reminderTime } from '../src/logic/reminders';

describe('nhắc mùng 1 & rằm', () => {
  it('liệt kê đúng thứ tự từ hôm nay, gồm Tết 2026', () => {
    const r = nextLunarReminders('2026-02-01', 3);
    // Rằm tháng Chạp Ất Tỵ = 02/02/2026; mùng 1 Tết Bính Ngọ = 17/02/2026; rằm tháng Giêng = 03/03/2026
    expect(r.map((x) => [x.dateKey, x.kind])).toEqual([
      ['2026-02-02', 'ram'],
      ['2026-02-17', 'mung-1'],
      ['2026-03-03', 'ram'],
    ]);
  });
  it('tính cả tháng nhuận (2025 nhuận tháng 6)', () => {
    const r = nextLunarReminders('2025-07-20', 3);
    expect(r[0]).toMatchObject({ dateKey: '2025-07-25', kind: 'mung-1', lunarMonth: 6, leap: true });
    expect(r.every((x, i) => i === 0 || x.dateKey > r[i - 1].dateKey)).toBe(true);
  });
  it('24 lần nhắc trải khoảng một năm, cách nhau 13–17 ngày', () => {
    const r = nextLunarReminders('2026-11-06', 24);
    expect(r).toHaveLength(24);
    for (let i = 1; i < r.length; i++) {
      const gap = (Date.parse(r[i].dateKey) - Date.parse(r[i - 1].dateKey)) / 86400000;
      expect(gap).toBeGreaterThanOrEqual(13);
      expect(gap).toBeLessThanOrEqual(17);
    }
  });
  it('giờ nhắc 6:30 giờ VN', () => {
    expect(reminderTime('2026-02-17').toISOString()).toBe('2026-02-16T23:30:00.000Z');
  });
});
