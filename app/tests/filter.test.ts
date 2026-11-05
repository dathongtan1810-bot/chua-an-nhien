import { describe, expect, it } from 'vitest';
import { checkText, maskText, normalizeVi, PROFANITY_LIST } from '../src/logic/filter';

describe('normalizeVi', () => {
  it('lowercases, strips diacritics and đ', () => {
    expect(normalizeVi('Đi Chùa Bình An')).toBe('di chua binh an');
  });
  it('maps leetspeak and removes inner separators', () => {
    expect(normalizeVi('F.u.c.k')).toBe('fuck');
    expect(normalizeVi('5h1t')).toBe('shit');
    expect(normalizeVi('đ-m')).toBe('dm');
    expect(normalizeVi('$@n')).toBe('san');
  });
  it('collapses repeated chars and joins spaced letters', () => {
    expect(normalizeVi('fuuuuck')).toBe('fuck');
    expect(normalizeVi('f u c k you')).toBe('fuck you');
    expect(normalizeVi('  nhiều    khoảng  ')).toBe('nhieu khoang');
  });
});

describe('checkText', () => {
  const clean = [
    'con lợn đất',
    'lon nước',
    'cách',
    'các bạn',
    'đi chùa',
    'địa điểm',
    'Cầu bình an',
    'Cầu cho mẹ luôn mạnh khỏe, bình an.',
    'Mua vài lon bia cho bố',
    'Con ăn các món chay hôm nay',
    'Buổi sáng an lành',
    'Đeo kính cho bà',
    'Cầu cho con chó nhà con khỏe mạnh',
    'Ngủ ngon nhé mọi người',
    'Thắng cho đội nhà',
    'Năm 2024 nhiều may mắn',
    'Mong con các bạn đều ngoan',
  ];
  for (const s of clean) {
    it(`passes: ${s}`, () => {
      expect(checkText(s)).toEqual({ ok: true });
    });
  }

  const bad = [
    'đm',
    'dm cuộc đời',
    'DMM',
    'vcl thật',
    'vl',
    'đ.m.m',
    'đéo cần',
    'địt mẹ',
    'dit me may',
    'cái lồn',
    'lon',
    'đồ cặc',
    'cc',
    'đồ chó má',
    'thằng chó',
    'mày là súc vật',
    'suc vat',
    'ngu như chó',
    'ngu nhu cho',
    'mẹ mày',
    'óc chó',
    'con đĩ',
    'fuck you',
    'F*CK',
    'fuuuuck',
    'motherfucker',
    's h i t',
    'what a bitch',
  ];
  for (const s of bad) {
    it(`rejects profanity: ${s}`, () => {
      expect(checkText(s)).toEqual({ ok: false, reason: 'profanity' });
    });
  }

  it('rejects empty', () => {
    expect(checkText('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkText('...')).toEqual({ ok: false, reason: 'empty' });
  });
  it('rejects too long (>120 after trim)', () => {
    expect(checkText('a '.repeat(70))).toEqual({ ok: false, reason: 'too_long' });
    expect(checkText('  ' + 'bình an '.repeat(15).trim() + '  ').ok).toBe(true);
  });
  it('rejects links', () => {
    for (const s of ['xem https://abc.xyz', 'vào www.spam.vn', 'ghé shop abc.com nhé', 'abc dot com', 'add zalo nhé']) {
      expect(checkText(s).reason).toBe('link');
    }
  });
  it('rejects phone numbers', () => {
    for (const s of ['gọi 0912345678', 'lh 0912 345 678', '+84 912.345.678']) {
      expect(checkText(s).reason).toBe('phone');
    }
  });
  it('rejects obvious spam', () => {
    expect(checkText('aaaaaaaaaaaa').reason).toBe('spam');
    expect(checkText('mua mua mua mua mua').reason).toBe('spam');
  });
});

describe('maskText', () => {
  it('masks bad words and keeps the rest', () => {
    expect(maskText('đm cuộc đời')).toBe('*** cuộc đời');
    expect(maskText('Cầu bình an, fuck!')).toBe('Cầu bình an, ***!');
    expect(maskText('mày là đồ chó má thật')).toBe('mày là *** thật');
  });
  it('leaves clean text unchanged', () => {
    expect(maskText('các bạn đi chùa')).toBe('các bạn đi chùa');
  });
});

describe('PROFANITY_LIST', () => {
  it('is exported and non-trivial', () => {
    expect(PROFANITY_LIST.length).toBeGreaterThan(50);
    expect(PROFANITY_LIST.every((e) => e.term.length > 0)).toBe(true);
  });
});
