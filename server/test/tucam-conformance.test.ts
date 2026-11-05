/**
 * Tương thích với bộ kiểm thử của nhánh nội dung (content/tu-cam.test.mjs, sao chép vào fixtures):
 * mọi câu `bat(...)` phải bị chặn và mọi câu trong `SACH` phải được cho qua bởi bộ lọc SERVER
 * khi dùng server/data/tu-cam.json.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { ContentFilter, parseWordList } from '../src/services/filter.js';

const tuCamUrl = new URL('../data/tu-cam.json', import.meta.url);
const hasData = fs.existsSync(tuCamUrl);
const src = fs.readFileSync(new URL('./fixtures/tu-cam.test.mjs.txt', import.meta.url), 'utf8');
const mustBlock = [...src.matchAll(/bat\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]!);
const sachMatch = /const SACH = (\[[\s\S]*?\]);/.exec(src);
const mustPass: string[] = sachMatch ? (new Function(`return ${sachMatch[1]}`)() as string[]) : [];

describe.skipIf(!hasData)('tương thích content/tu-cam.json', () => {
  const parsed = parseWordList(JSON.parse(fs.readFileSync(tuCamUrl, 'utf8')));
  const f = new ContentFilter({ words: parsed.words, unaccentedAlso: [], substitutions: parsed.substitutions });

  it('đọc được bộ kiểm thử', () => {
    expect(mustBlock.length).toBeGreaterThan(40);
    expect(mustPass.length).toBeGreaterThan(40);
  });

  it('chặn mọi câu nhánh nội dung yêu cầu chặn', () => {
    const missed = mustBlock.filter((t) => f.check(t).ok);
    expect(missed).toEqual([]);
  });

  it('không chặn nhầm câu sạch', () => {
    const wrong = mustPass.map((t) => ({ t, r: f.check(t) })).filter((x) => !x.r.ok).map((x) => `${x.t} → ${x.r.reason}:${x.r.match}`);
    expect(wrong).toEqual([]);
  });

  it('hiệu năng: < 5 ms/câu với toàn bộ danh sách', () => {
    const arr = JSON.parse(fs.readFileSync(new URL('./fixtures/loi-nguyen-mau.json', import.meta.url), 'utf8')) as Array<{ noiDung: string }>;
    const t0 = performance.now();
    for (const x of arr) f.check(x.noiDung);
    expect((performance.now() - t0) / arr.length).toBeLessThan(5);
  });

  it('không chặn nhầm 300 lời nguyện mẫu', () => {
    const arr = JSON.parse(fs.readFileSync(new URL('./fixtures/loi-nguyen-mau.json', import.meta.url), 'utf8')) as Array<{ noiDung: string }>;
    const wrong = arr.map((x) => ({ t: x.noiDung, r: f.check(x.noiDung) })).filter((x) => !x.r.ok).map((x) => `${x.t} → ${x.r.reason}:${x.r.match}`);
    expect(wrong).toEqual([]);
  });
});

describe.skipIf(!hasData)('fuzz biến thể lách trên mọi từ cấm mucDo ≥ 2', () => {
  const data = JSON.parse(fs.readFileSync(tuCamUrl, 'utf8')) as { tuCam: Array<{ tu: string; mucDo: number }> };
  const parsed = parseWordList(data);
  const f = new ContentFilter({ words: parsed.words, unaccentedAlso: [], substitutions: parsed.substitutions });
  const words = data.tuCam.filter((m) => m.mucDo >= 2).map((m) => m.tu);
  const variants: Record<string, (w: string) => string> = {
    upper: (w) => w.toUpperCase(),
    dots: (w) => w.split(' ').map((x) => [...x].join('.')).join(' '),
    spaces: (w) => [...w].filter((c) => c !== ' ').join(' '),
    dashes: (w) => w.split(' ').map((x) => [...x].join('-')).join(' '),
    repeatLast: (w) => w.replace(/(\p{L})$/u, '$1$1$1$1'),
    inSentence: (w) => `hôm nay ${w} quá`,
    zeroWidth: (w) => [...w].join(String.fromCharCode(0x200b)),
    singleLeet: (w) => w.replace(/[oiae](?=\p{L})/u, (c) => ({ o: '0', i: '1', a: '4', e: '3' })[c]!),
  };
  for (const [name, fn] of Object.entries(variants)) {
    it(name, () => {
      const missed = words.map((w) => [w, fn(w)] as const).filter(([, v]) => f.check(v).ok).map(([w, v]) => `${w} → ${v}`);
      expect(missed).toEqual([]);
    });
  }
});
