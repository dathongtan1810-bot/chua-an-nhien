import { describe, expect, it } from 'vitest';
import { decorationsFor, eventsForLunarDate } from '../src/logic/lunarEvents';
import type { SuKien } from '../src/data/content';
import sample from '../src/data/sample-su-kien-am-lich.json';

const list = sample as SuKien[];
const names = (xs: SuKien[]) => xs.map((x) => x.ten);

describe('eventsForLunarDate', () => {
  it('matches monthly events every month', () => {
    expect(names(eventsForLunarDate(list, { day: 1, month: 6, leap: false }, 30))).toEqual(['Mùng 1']);
    expect(names(eventsForLunarDate(list, { day: 15, month: 9, leap: false }, 29))).toEqual(['Ngày Rằm']);
    expect(eventsForLunarDate(list, { day: 2, month: 6, leap: false }, 30)).toEqual([]);
  });
  it('matches annual events plus monthly ones', () => {
    const tet = names(eventsForLunarDate(list, { day: 1, month: 1, leap: false }, 30));
    expect(tet).toContain('Tết Nguyên Đán');
    expect(tet).toContain('Mùng 1');
    expect(names(eventsForLunarDate(list, { day: 15, month: 7, leap: false }, 29))).toContain('Lễ Vu Lan báo hiếu');
  });
  it('leap months keep monthly events but skip annual ones', () => {
    const leap = names(eventsForLunarDate(list, { day: 15, month: 7, leap: true }, 30));
    expect(leap).toEqual(['Ngày Rằm']);
  });
  it('Giao thừa falls on the last day of month 12', () => {
    expect(names(eventsForLunarDate(list, { day: 29, month: 12, leap: false }, 29))).toContain('Tất niên – Giao thừa');
    expect(names(eventsForLunarDate(list, { day: 29, month: 12, leap: false }, 30))).not.toContain('Tất niên – Giao thừa');
    expect(names(eventsForLunarDate(list, { day: 30, month: 12, leap: false }, 30))).toContain('Tất niên – Giao thừa');
    expect(names(eventsForLunarDate(list, { day: 29, month: 11, leap: false }, 29))).toEqual([]);
  });
});

describe('decorationsFor', () => {
  it('merges unique tokens', () => {
    const evs = eventsForLunarDate(list, { day: 15, month: 7, leap: false }, 30);
    const d = decorationsFor(evs);
    expect(d).toContain('hoa-hong');
    expect(d).toContain('trang-ram');
    expect(new Set(d).size).toBe(d.length);
    expect(decorationsFor([])).toEqual([]);
    expect(decorationsFor([{ ...list[0], trangTri: ' a, b ,a,,' }])).toEqual(['a', 'b']);
  });
});
