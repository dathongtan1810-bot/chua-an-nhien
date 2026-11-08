import { describe, expect, it } from 'vitest';
import { incenseRemaining, insideBurner, isSteady, rhythmVariation } from '../src/rituals/pure';

describe('nhịp mõ', () => {
  it('nhịp đều được nhận ra', () => {
    expect(isSteady([600, 610, 590, 605, 600, 598, 602, 600])).toBe(true);
    expect(isSteady([600, 300, 900, 605, 600, 200, 602, 600])).toBe(false);
    expect(isSteady([600, 600])).toBe(false);
    expect(isSteady(Array(8).fill(100))).toBe(false); // quá nhanh
  });
  it('rhythmVariation = 0 khi đều tuyệt đối', () => expect(rhythmVariation([500, 500, 500])).toBe(0));
});

describe('thắp hương', () => {
  it('hương cháy dần', () => {
    expect(incenseRemaining(0, 180000)).toBe(1);
    expect(incenseRemaining(90000, 180000)).toBe(0.5);
    expect(incenseRemaining(999999, 180000)).toBe(0);
  });
  it('kiểm tra vị trí cắm hương', () => {
    expect(insideBurner(100, 100, 110, 100, 20)).toBe(true);
    expect(insideBurner(200, 100, 110, 100, 20)).toBe(false);
  });
});
