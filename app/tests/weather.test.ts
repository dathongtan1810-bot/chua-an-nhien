import { describe, expect, it } from 'vitest';
import { isDrizzleDay } from '../src/logic/weather';

describe('mưa phùn xuân', () => {
  it('chỉ trong tháng 1–3 âm lịch', () => {
    for (const m of [4, 6, 9, 12]) expect(isDrizzleDay(m, '2026-07-01')).toBe(false);
  });
  it('khoảng 45% số ngày trong mùa và cố định theo ngày', () => {
    let rainy = 0;
    for (let d = 0; d < 300; d++) {
      const key = new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10);
      if (isDrizzleDay(2, key)) rainy++;
      expect(isDrizzleDay(2, key)).toBe(isDrizzleDay(2, key));
    }
    expect(rainy / 300).toBeGreaterThan(0.3);
    expect(rainy / 300).toBeLessThan(0.6);
  });
});
