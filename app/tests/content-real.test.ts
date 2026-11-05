import { describe, expect, it } from 'vitest';
import { contentSource, getLoiNguyenMau, getQueXam, getSuKien, getThongDiep } from '../src/data/content';

describe('nội dung thật từ ../content (phiên nội dung)', () => {
  it('nạp được, đúng schema sau chuẩn hóa', () => {
    expect(Object.values(contentSource()).every((v) => v === 'content' || v === 'sample')).toBe(true);
    expect(getQueXam().length).toBeGreaterThan(0);
    expect(getQueXam().every((q) => typeof q.tho === 'string')).toBe(true);
    expect(getThongDiep().length).toBeGreaterThan(0);
    expect(getSuKien().every((e) => typeof e.trangTri === 'string' && e.thang >= 0)).toBe(true);
    expect(getLoiNguyenMau().length).toBeGreaterThan(0);
  });
});
