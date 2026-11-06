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

describe('nội dung tiếng Anh (content/i18n/en)', () => {
  it('tải lười, cùng số lượng & id, sự kiện giữ ngày và trang trí của bản Việt', async () => {
    const { loadLangContent, getQueXam: q, getSuKien: sk } = await import('../src/data/content');
    const { setLang } = await import('../src/core/i18n');
    setLang('vi');
    const viQ = q();
    const viE = sk();
    await loadLangContent('en');
    setLang('en');
    try {
      const enQ = q();
      expect(enQ.length).toBe(viQ.length);
      expect(enQ.map((x) => x.id)).toEqual(viQ.map((x) => x.id));
      expect(enQ[0].tieuDe).not.toBe(viQ[0].tieuDe);
      const enE = sk();
      expect(enE.map((e) => [e.thang, e.ngay, e.trangTri])).toEqual(viE.map((e) => [e.thang, e.ngay, e.trangTri]));
    } finally {
      setLang('vi');
    }
  });
});
