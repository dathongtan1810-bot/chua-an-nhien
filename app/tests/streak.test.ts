import { describe, expect, it } from 'vitest';
import { currentStreak, emptyStreak, visit } from '../src/logic/streak';

describe('streak', () => {
  it('tăng theo ngày liên tiếp, không đổi khi cùng ngày', () => {
    let s = visit(emptyStreak(), '2026-11-02');
    s = visit(s, '2026-11-02');
    s = visit(s, '2026-11-03');
    expect(s.count).toBe(2);
  });

  it('được nghỉ 1 ngày/tuần không mất chuỗi', () => {
    let s = visit(emptyStreak(), '2026-11-02'); // T2
    s = visit(s, '2026-11-03');
    s = visit(s, '2026-11-05'); // nghỉ T4
    expect(s.count).toBe(3);
    s = visit(s, '2026-11-07'); // nghỉ T6 cùng tuần → mất chuỗi
    expect(s.count).toBe(1);
    expect(s.best).toBe(3);
  });

  it('nghỉ ở tuần mới được miễn tiếp', () => {
    let s = visit(emptyStreak(), '2026-11-04');
    s = visit(s, '2026-11-06'); // nghỉ T5 tuần 2/11
    s = visit(s, '2026-11-07');
    s = visit(s, '2026-11-08');
    s = visit(s, '2026-11-10'); // nghỉ T2 9/11 — tuần mới
    expect(s.count).toBe(5);
  });

  it('nghỉ 2 ngày liền thì bắt đầu lại; currentStreak phản ánh', () => {
    let s = visit(emptyStreak(), '2026-11-02');
    expect(currentStreak(s, '2026-11-04')).toBe(1);
    expect(currentStreak(s, '2026-11-05')).toBe(0);
    s = visit(s, '2026-11-05');
    expect(s.count).toBe(1);
  });
});
