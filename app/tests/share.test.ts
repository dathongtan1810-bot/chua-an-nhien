import { describe, expect, it } from 'vitest';
import { wrapText } from '../src/share/card';

describe('wrapText', () => {
  const m = (s: string) => s.length * 10;
  it('ngắt dòng theo độ rộng và giữ xuống dòng', () => {
    expect(wrapText(m, 'một hai ba bốn năm', 80)).toEqual(['một hai', 'ba bốn', 'năm']);
    expect(wrapText(m, 'a\nb', 100)).toEqual(['a', 'b']);
  });
});
