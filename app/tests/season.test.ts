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

describe('nhiệm vụ mùa', () => {
  it('phân loại theo những gì app có', async () => {
    const { classifyQuest } = await import('../src/logic/season');
    const q = (ten: string, moTa: string) => ({ id: 'x', ten, moTa });
    expect(classifyQuest(q('Tĩnh tâm đêm giao thừa', 'Ngồi yên 5 phút nghe tiếng chuông chùa'))).toEqual({ hidden: false, ritual: 'meditation', minMinutes: 5 });
    expect(classifyQuest(q('Thả đèn hoa đăng', 'Thả một chiếc đèn hoa đăng ảo trên hồ'))).toEqual({ hidden: false, ritual: 'lantern' });
    expect(classifyQuest(q('Quẻ đầu năm', 'Gieo một quẻ xăm đầu năm')).ritual).toBe('fortune');
    expect(classifyQuest(q('Chúc Tết người thân', 'Gọi điện cho ông bà'))).toEqual({ hidden: false, ritual: null });
    expect(classifyQuest(q('Gói bánh chưng', 'gói một chiếc bánh chưng ảo')).hidden).toBe(true);
    expect(classifyQuest(q('Nghi lễ tắm Phật', 'tắm Phật ảo: rót ba gáo nước')).hidden).toBe(true);
    expect(classifyQuest(q('Treo lời nguyện', 'Viết lời nguyện và treo lên Cây nguyện')).hidden).toBe(true);
    // "kỷ niệm" không phải niệm Phật
    expect(classifyQuest(q('Kể một kỷ niệm', 'Viết một kỷ niệm đẹp về ông bà')).ritual).toBeNull();
  });
  it('reducer: +2 Hạt sen một lần cho mỗi nhiệm vụ mỗi mùa mỗi năm', async () => {
    const { initialState, reduce } = await import('../src/core/state');
    const { questKey } = await import('../src/logic/season');
    let s = initialState('d', 'n', '2026-02-20');
    const k = questKey('tet', 2026, 'chuc-tet');
    s = reduce(s, { type: 'seasonQuest', key: k, dateKey: '2026-02-20' }).state;
    s = reduce(s, { type: 'seasonQuest', key: k, dateKey: '2026-02-21' }).state;
    expect(s.hatSen).toBe(2);
    s = reduce(s, { type: 'seasonQuest', key: questKey('tet', 2027, 'chuc-tet'), dateKey: '2027-02-10' }).state;
    expect(s.hatSen).toBe(4);
  });
});

describe('năm của mùa', () => {
  it('mùa Tết vắt năm: tháng Giêng vẫn tính năm bắt đầu', async () => {
    const { seasonYear } = await import('../src/logic/season');
    const tet = { khoangNgayAm: { tu: { thang: 12, ngay: 23 }, den: { thang: 1, ngay: 15 } } };
    expect(seasonYear(tet, { month: 12, day: 25, year: 2025 })).toBe(2025);
    expect(seasonYear(tet, { month: 1, day: 3, year: 2026 })).toBe(2025);
    const vuLan = { khoangNgayAm: { tu: { thang: 7, ngay: 1 }, den: { thang: 7, ngay: 30 } } };
    expect(seasonYear(vuLan, { month: 7, day: 15, year: 2026 })).toBe(2026);
  });
});
