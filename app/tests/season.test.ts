import { describe, expect, it } from 'vitest';
import { activeSeason, inLunarRange, type Season } from '../src/logic/season';
import { getSeasons } from '../src/data/content';

const range = (a: [number, number], b: [number, number]) => ({ tu: { thang: a[0], ngay: a[1] }, den: { thang: b[0], ngay: b[1] } });

describe('mùa theo âm lịch', () => {
  it('khoảng vắt qua năm (Tết 23/12 → 15/1)', () => {
    const r = range([12, 23], [1, 15]);
    expect(inLunarRange(12, 23, r)).toBe(true);
    expect(inLunarRange(12, 30, r)).toBe(true);
    expect(inLunarRange(1, 1, r)).toBe(true);
    expect(inLunarRange(1, 15, r)).toBe(true);
    expect(inLunarRange(1, 16, r)).toBe(false);
    expect(inLunarRange(12, 22, r)).toBe(false);
  });
  it('mùa chồng nhau: chọn mùa cụ thể hơn (Rằm tháng Giêng trong mùa Tết)', () => {
    const s = (id: string, r: ReturnType<typeof range>) => ({ id, khoangNgayAm: r }) as unknown as Season;
    const list = [s('tet', range([12, 23], [1, 15])), s('ram-thang-gieng', range([1, 13], [1, 16]))];
    expect(activeSeason(list, { month: 1, day: 14 })?.id).toBe('ram-thang-gieng');
    expect(activeSeason(list, { month: 1, day: 5 })?.id).toBe('tet');
    expect(activeSeason(list, { month: 6, day: 5 })).toBeNull();
  });
  it('nạp đủ 7 bộ mùa thật', () => {
    const ids = getSeasons().map((s) => s.id).sort();
    expect(ids).toEqual(['doan-ngo', 'phat-dan', 'ram-thang-gieng', 'tet', 'thanh-dao', 'trung-thu', 'vu-lan']);
    expect(activeSeason(getSeasons(), { month: 7, day: 15 })?.id).toBe('vu-lan');
  });
});
