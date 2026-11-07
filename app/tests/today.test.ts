import { describe, expect, it } from 'vitest';
import { eventRitualFor, todayInfo } from '../src/core/today';

describe('todayInfo', () => {
  it('Tết 2026 (17/02/2026 giờ VN) có sự kiện Tết và trang trí', () => {
    const info = todayInfo(Date.parse('2026-02-17T03:00:00Z'));
    expect(info.lunar.day).toBe(1);
    expect(info.lunar.month).toBe(1);
    expect(info.events[0].ten).toContain('Tết');
    expect(info.decorations).toContain('den-long');
    expect(info.message.length).toBeGreaterThan(0);
  });
  it('dùng giờ VN: 17:30 UTC ngày 16/02 đã là mùng 1 Tết', () => {
    expect(todayInfo(Date.parse('2026-02-16T17:30:00Z')).lunar.day).toBe(1);
  });
  it('Vu Lan 2025 có hoa hồng', () => {
    expect(todayInfo(Date.parse('2025-09-06T05:00:00Z')).decorations).toContain('hoa-hong');
  });
  it('suy ra nghi thức sự kiện', () => {
    expect(eventRitualFor('Thả một đèn hoa đăng')).toBe('lantern');
    expect(eventRitualFor('Thắp một nén hương')).toBe('incense');
    expect(eventRitualFor('Gọi điện cho mẹ')).toBe('any');
  });
});

describe('todayInfo — bộ mùa', () => {
  it('mùa Vu Lan (7/2026 âm): thông điệp & trang trí của mùa', async () => {
    const { getSeasons } = await import('../src/data/content');
    // 9/7 âm lịch Bính Ngọ = 21/08/2026
    const info = todayInfo(Date.parse('2026-08-21T05:00:00Z'));
    expect(info.lunar.month).toBe(7);
    expect(info.season?.id).toBe('vu-lan');
    const vuLan = getSeasons().find((s) => s.id === 'vu-lan')!;
    expect(vuLan.thongDiep.map((m) => m.noiDung)).toContain(info.message);
  });
  it('ngoài mùa thì không có season', () => {
    expect(todayInfo(Date.parse('2026-11-07T05:00:00Z')).season).toBeNull();
  });
});
