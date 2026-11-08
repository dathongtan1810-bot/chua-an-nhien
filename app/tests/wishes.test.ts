import { describe, expect, it } from 'vitest';
import { groupWishesByWeek } from '../src/ui/wishes';

describe('lời nguyện theo tuần', () => {
  it('nhóm theo tuần giờ VN (thứ Hai), mới nhất trước, bỏ mục không phải đèn', () => {
    const weeks = groupWishesByWeek([
      { id: 1, at: '2026-11-02T03:00:00Z', kind: 'lantern', detail: { text: 'A' } }, // T2 02/11
      { id: 2, at: '2026-11-08T16:30:00Z', kind: 'lantern', detail: { text: 'B' } }, // 23:30 CN 08/11 VN → tuần 02/11
      { id: 3, at: '2026-11-08T17:30:00Z', kind: 'lantern', detail: { text: 'C' } }, // 00:30 T2 09/11 VN → tuần 09/11
      { id: 4, at: '2026-11-05T03:00:00Z', kind: 'incense', detail: { count: 3 } },
    ]);
    expect(weeks.map((w) => w.week)).toEqual(['2026-11-09', '2026-11-02']);
    expect(weeks[1].wishes.map((e) => e.detail.text)).toEqual(['B', 'A']);
  });
});
