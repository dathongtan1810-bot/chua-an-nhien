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
