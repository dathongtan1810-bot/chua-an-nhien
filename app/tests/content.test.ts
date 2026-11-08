import { describe, expect, it } from 'vitest';
import {
  contentSource,
  getLoiNguyenMau,
  getQueXam,
  getSuKien,
  getThongDiep,
  isLoiNguyenMau,
  isQueXam,
  isSuKien,
  isThongDiep,
  pickContent,
} from '../src/data/content';
import sampleQue from '../src/data/sample-que-xam.json';
import sampleTd from '../src/data/sample-thong-diep-ngay.json';
import sampleSk from '../src/data/sample-su-kien-am-lich.json';
import sampleLn from '../src/data/sample-loi-nguyen-mau.json';

const TOPICS = ['binh-an', 'gia-dao', 'cong-danh', 'hoc-tap', 'suc-khoe', 'tinh-duyen'];
const DECOR = ['den-long', 'hoa-sen', 'hoa-hong', 'phao-hoa-nhe', 'trang-ram', 'co-phuon', 'hoa-dao-mai'];
const SCARY = /(\bhung\b|đại hung|xui xẻo|tai họa|tai ương|tai nạn|chết|cúng tiền|giải hạn|đóng tiền|nộp tiền)/i;

describe('pickContent', () => {
  const isNum = (x: unknown): boolean => typeof x === 'number';
  it('keeps valid entries from external content', () => {
    expect(pickContent([1, 'x', 2], [9], isNum)).toEqual({ items: [1, 2], source: 'content' });
  });
  it('falls back to the sample when nothing is valid', () => {
    expect(pickContent(['a'], [9], isNum)).toEqual({ items: [9], source: 'sample' });
    expect(pickContent(undefined, [9], isNum)).toEqual({ items: [9], source: 'sample' });
    expect(pickContent({ a: 1 }, [9], isNum)).toEqual({ items: [9], source: 'sample' });
    expect(pickContent([], [9], isNum).source).toBe('sample');
  });
});

describe('validators', () => {
  it('reject malformed entries', () => {
    expect(isQueXam({ id: 1 })).toBe(false);
    expect(isQueXam(null)).toBe(false);
    expect(isThongDiep({ id: '1', noiDung: 'x' })).toBe(false);
    expect(isSuKien({ ten: 'x', thang: 13, ngay: 1, moTa: '', trangTri: '', nhiemVu: '' })).toBe(false);
    expect(isSuKien({ ten: 'x', thang: 1, ngay: 0, moTa: '', trangTri: '', nhiemVu: '' })).toBe(false);
    expect(isLoiNguyenMau({ chuDe: 'binh-an' })).toBe(false);
  });
});

describe('sample data', () => {
  it('que xam: 36 valid sticks covering all 6 topics with gentle levels', () => {
    expect(sampleQue).toHaveLength(36);
    const ids = new Set<number>();
    for (const q of sampleQue) {
      expect(isQueXam(q)).toBe(true);
      ids.add(q.id);
      expect(q.tho.split('\n')).toHaveLength(4);
      expect(q.tieuDe).toMatch(/^Quẻ số \d+ – (Thượng|Trung|Bình|Trung Bình)$/);
      expect(q.tieuDe).toContain(`Quẻ số ${q.id} `);
      for (const t of q.chuDe) expect(TOPICS).toContain(t);
      for (const t of TOPICS) {
        expect(q.chuDe).toContain(t);
        expect((q.loiGiaiTheoChuDe as Record<string, string>)[t]).toBeTruthy();
      }
      const all = [q.tho, q.loiGiai, q.loiKhuyen, ...Object.values(q.loiGiaiTheoChuDe)].join(' ');
      expect(all).not.toMatch(SCARY);
      expect(all.normalize('NFC')).toBe(all);
    }
    expect(ids.size).toBe(36);
  });

  it('thong diep: 60 unique short messages', () => {
    expect(sampleTd).toHaveLength(60);
    expect(new Set(sampleTd.map((x) => x.id)).size).toBe(60);
    for (const t of sampleTd) {
      expect(isThongDiep(t)).toBe(true);
      expect(t.noiDung.length).toBeLessThanOrEqual(140);
    }
  });

  it('loi nguyen mau: 40 templates in known topics', () => {
    const topics = ['gia-dinh', 'suc-khoe', 'hoc-tap', 'binh-an', 'tri-an', 'the-gioi'];
    expect(sampleLn).toHaveLength(40);
    for (const l of sampleLn) {
      expect(isLoiNguyenMau(l)).toBe(true);
      expect(topics).toContain(l.chuDe);
      expect(l.noiDung.length).toBeLessThanOrEqual(120);
    }
    for (const t of topics) expect(sampleLn.some((l) => l.chuDe === t)).toBe(true);
  });

  it('su kien: valid, known decoration tokens, key festivals present', () => {
    for (const e of sampleSk) {
      expect(isSuKien(e)).toBe(true);
      for (const tok of e.trangTri.split(',')) expect(DECOR).toContain(tok.trim());
      if (e.trangTri.includes('phao-hoa-nhe')) expect([1, 12]).toContain(e.thang);
    }
    const has = (m: number, d: number) => sampleSk.some((e) => e.thang === m && e.ngay === d);
    for (const [m, d] of [[0, 1], [0, 15], [1, 1], [1, 2], [1, 3], [1, 15], [3, 3], [4, 15], [5, 5], [7, 15], [8, 15], [10, 15], [12, 23], [12, 30]]) {
      expect(has(m, d)).toBe(true);
    }
    expect(sampleSk.find((e) => e.thang === 7 && e.ngay === 15)?.trangTri).toContain('hoa-hong');
  });
});

describe('getters', () => {
  it('return non-empty validated lists and report their source', () => {
    expect(getQueXam().length).toBeGreaterThan(0);
    expect(getThongDiep().length).toBeGreaterThan(0);
    expect(getSuKien().length).toBeGreaterThan(0);
    expect(getLoiNguyenMau().length).toBeGreaterThan(0);
    const src = contentSource();
    expect(Object.keys(src).sort()).toEqual(['loi-nguyen-mau', 'que-xam', 'su-kien-am-lich', 'thong-diep-ngay']);
    for (const v of Object.values(src)) expect(['content', 'sample']).toContain(v);
  });
});
