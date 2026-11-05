import { describe, expect, it } from 'vitest';
import { contentSource, getQueXam, getSuKien, getThongDiep, getLoiNguyenMau } from '../src/data/content';

describe('nội dung thật từ ../content (nếu có)', () => {
  it('nạp được và không rỗng', () => {
    const src = contentSource();

    expect(getQueXam().length).toBeGreaterThan(0);
    expect(getThongDiep().length).toBeGreaterThan(0);
    expect(getSuKien().length).toBeGreaterThan(0);
  });
});
