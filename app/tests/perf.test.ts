import { describe, expect, it } from 'vitest';
import { shouldLowerQuality } from '../src/core/perf';

describe('perf', () => {
  it('chỉ hạ chất lượng khi FPS trung bình thấp và đủ mẫu', () => {
    expect(shouldLowerQuality([30, 32, 35, 33])).toBe(true);
    expect(shouldLowerQuality([58, 60, 59, 57])).toBe(false);
    expect(shouldLowerQuality([20, 20])).toBe(false);
  });
});
