import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { ContentFilter, parseWordList, stripDiacritics, tokenize } from '../src/services/filter.js';

const list = parseWordList(JSON.parse(fs.readFileSync(new URL('../data/banned-words.json', import.meta.url), 'utf8')));
const f = new ContentFilter({ words: list.words, unaccentedAlso: list.unaccentedAlso });
const bad = (t: string) => f.check(t);

describe('ContentFilter', () => {
  it('cho qua lời nguyện bình thường', () => {
    for (const t of [
      'Cầu mong gia đình bình an, mạnh khỏe',
      'Chúc con lớn khôn, học giỏi',
      'chuc con lon khon hoc gioi', // "lon" không dấu ≠ từ cấm có dấu
      'Nguyện cho mẹ sớm khỏi bệnh 🙏',
      'Cầu cho các cháu thi đỗ năm 2026',
      'Đi tắm biển cùng bố mẹ',
      'Mong buổi sáng nào cũng an yên',
      'Du lịch đầu xuân bình an',
    ]) {
      expect(bad(t), t).toMatchObject({ ok: true });
    }
  });

  it('không chặn nhầm 300 lời nguyện mẫu (vi + en) của nhánh nội dung', () => {
    for (const file of ['loi-nguyen-mau.json', 'loi-nguyen-mau.en.json']) {
      const arr = JSON.parse(fs.readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8')) as Array<{ noiDung: string }>;
      expect(arr.length).toBeGreaterThan(50);
      const rejected = arr.map((x) => ({ t: x.noiDung, r: f.check(x.noiDung) })).filter((x) => !x.r.ok);
      expect(rejected.map((x) => `${x.r.reason}:${x.r.match} | ${x.t}`)).toEqual([]);
    }
  });

  it('văn bản có dấu không bị so khớp không dấu (tránh chặn nhầm)', () => {
    for (const t of ['Đặt chỗ để xe gọn gàng', 'Mệt ở chỗ làm', 'Con nguyện sống tốt', 'Ghi chép cho dễ', 'Mong con lớn nhanh', 'Các con ngoan']) {
      expect(bad(t), t).toMatchObject({ ok: true });
    }
    // nhưng gõ không dấu vẫn bắt
    expect(bad('cho de').reason).toBe('banned_word');
    expect(bad('thang ngu').reason).toBe('banned_word');
  });

  it('chặn từ cấm có dấu và không dấu', () => {
    expect(bad('đồ lồn').reason).toBe('banned_word');
    expect(bad('dit me may').reason).toBe('banned_word');
    expect(bad('ĐỊT').reason).toBe('banned_word');
    expect(bad('thang ngu').reason).toBe('banned_word');
    expect(bad('thằng ngu').reason).toBe('banned_word');
    expect(bad('vcl that').reason).toBe('banned_word');
  });

  it('chặn biến thể chèn ký tự / khoảng trắng / leet / lặp chữ', () => {
    expect(bad('đ.ị.t').reason).toBe('banned_word');
    expect(bad('d i t').reason).toBe('banned_word');
    expect(bad('f-u-c-k you').reason).toBe('banned_word');
    expect(bad('fuuuuck').reason).toBe('banned_word');
    expect(bad('sh1t').reason).toBe('banned_word');
    expect(bad('k h ố n n ạ n').reason).toBe('banned_word');
    expect(bad('mấtdạy').reason).toBe('banned_word'); // nén ≥5 ký tự
  });

  it('chặn link, email, số điện thoại', () => {
    expect(bad('vào https://abc.xyz nhé').reason).toBe('link');
    expect(bad('www . abc . com').reason).toBe('link');
    expect(bad('ghé shopabc.vn').reason).toBe('link');
    expect(bad('ghé shopabc chấm com').reason).toBe('link');
    expect(bad('mail a.b@gmail.com').reason).toBe('link');
    expect(bad('gọi 0912 345 678').reason).toBe('phone');
    expect(bad('gọi 0912.345.678').reason).toBe('phone');
    expect(bad('+84 912345678').reason).toBe('phone');
    expect(bad('không chín một hai ba bốn năm sáu bảy').reason).toBe('phone');
  });

  it('chặn quảng cáo', () => {
    expect(bad('Kết bạn zalo nhé').reason).toBe('ads');
    expect(bad('nha cai uy tin').reason).toBe('ads');
    expect(bad('Khuyến mãi lớn, liên hệ ngay').reason).toBe('ads');
    expect(bad('Con nguyện không mua chỉ vì giảm giá').ok).toBe(true); // 1 từ yếu thì cho qua
  });

  it('kiểm tra độ dài & rỗng & spam', () => {
    expect(bad('   ').reason).toBe('empty');
    expect(bad('a'.repeat(121)).reason).toBe('too_long');
    expect(bad('ơ'.repeat(120)).reason).toBe('spam');
    expect(bad('x'.repeat(10)).ok).toBe(false);
    expect(f.check('An'.padEnd(120, ' ')).ok).toBe(true);
  });

  it('chuẩn hoá', () => {
    expect(stripDiacritics('Đường Việt Nam')).toBe('Duong Viet Nam');
    expect(tokenize('Đ.Ị.T  mẹ')).toEqual(['địt', 'mẹ']);
    expect(f.check('  a\u0000b  ').clean).toBe('a b');
  });

  it('cập nhật danh sách từ', () => {
    const g = new ContentFilter({ words: ['hoa hồng'] });
    expect(g.check('tặng hoa hồng').ok).toBe(false);
    expect(g.check('tang hoa hong').ok).toBe(false);
    g.setWords(['cúc']);
    expect(g.check('tặng hoa hồng').ok).toBe(true);
  });

  it('parseWordList nhiều định dạng', () => {
    expect(parseWordList(['a', 'b']).words).toEqual(['a', 'b']);
    expect(parseWordList({ tucam: ['a'], quangcao: ['b'] }).words).toEqual(['a', 'b']);
    expect(parseWordList([{ word: 'a', variants: ['a1'] }, { tu: 'b' }]).words).toEqual(['a', 'a1', 'b']);
  });
});

describe('định dạng content/tu-cam.json', () => {
  const data = {
    ghiChu: 'mẫu thử',
    thayKyTu: { '9': 'g' },
    tuCam: [
      { tu: 'lồn', nhom: 'tuc', mucDo: 3, bienThe: ['loz'], bienTheLach: ['lon'] },
      { tu: 'cặc', nhom: 'tuc', mucDo: 3, bienTheLach: ['cac'] },
      { tu: 'ngu', nhom: 'xuc-pham', mucDo: 1 },
    ],
    allowlist: ['con ngủ', 'ngủ ngon'],
  };
  const parsed = parseWordList(data);
  const g = new ContentFilter({ words: parsed.words, substitutions: parsed.substitutions, unaccentedAlso: [] });

  it('parse: biến thể lách & allowlist được mã hoá, bỏ metadata', () => {
    expect(parsed.words).toEqual(['lồn', 'loz', '~lon', 'cặc', '~cac', 'ngu', '+con ngủ', '+ngủ ngon']);
    expect(parsed.substitutions).toEqual({ '9': 'g' });
  });

  it('bienTheLach chỉ tính khi có dấu hiệu lách', () => {
    expect(g.check('chúc con lớn khôn').ok).toBe(true);
    expect(g.check('chuc con lon khon').ok).toBe(true);
    expect(g.check('cac con ngoan').ok).toBe(true);
    expect(g.check('đồ l0n').ok).toBe(false);
    expect(g.check('đồ l.o.n').ok).toBe(false);
    expect(g.check('c a c').ok).toBe(false);
    expect(g.check('loooon').ok).toBe(false);
    expect(g.check('loz').ok).toBe(false);
  });

  it('allowlist che cụm hợp lệ', () => {
    expect(g.check('ngu').ok).toBe(false);
    expect(g.check('con ngủ ngoan nhé').ok).toBe(true); // "ngủ" có dấu ≠ "ngu" vốn đã qua; allowlist không làm hỏng
    expect(g.check('chúc ngủ ngon').ok).toBe(true);
    expect(g.check('con ngu ngủ ngon').ok).toBe(false); // phần ngoài allowlist vẫn bị bắt
  });

  it('thayKyTu tuỳ chỉnh', () => {
    const h = new ContentFilter({ words: ['gà'], substitutions: { '9': 'g' } });
    expect(h.check('con 9à').ok).toBe(false);
    expect(h.check('năm 2029').ok).toBe(true);
  });
});
