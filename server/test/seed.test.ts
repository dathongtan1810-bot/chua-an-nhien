import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSeedWords } from '../src/app.js';
import { testConfig } from '../src/config.js';
import { emitAck, startServer } from './helpers.js';

describe('seed từ cấm', () => {
  it('BANNED_WORDS_PATH định dạng tu-cam.json được ưu tiên (một nguồn duy nhất)', () => {
    const f = path.join(os.tmpdir(), `tu-cam-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify({ tuCam: [{ tu: 'hoa quỳnh', bienTheLach: ['hq'] }], allowlist: ['quỳnh hoa'], thayKyTu: { '9': 'g' } }));
    const seed = loadSeedWords(testConfig({ BANNED_WORDS_PATH: f }));
    expect(seed.words).toContain('hoa quỳnh');
    expect(seed.words).toContain('~hq');
    expect(seed.words).toContain('+quỳnh hoa');
    expect(seed.words).not.toContain('địt'); // không gộp danh sách mặc định
    expect(seed.unaccentedAlso).toEqual([]);
    expect(seed.substitutions).toEqual({ '9': 'g' });
    expect(seed.source).toBe(path.basename(f));
  });

  it('mặc định dùng data/tu-cam.json nếu có, không thì banned-words.json', () => {
    const seed = loadSeedWords(testConfig());
    expect(['tu-cam.json', 'banned-words.json']).toContain(seed.source);
    expect(seed.words.length).toBeGreaterThan(50);
  });

  it('file hỏng bị bỏ qua', () => {
    const f = path.join(os.tmpdir(), `broken-${process.pid}.json`);
    fs.writeFileSync(f, '{not json');
    const seed = loadSeedWords(testConfig({ BANNED_WORDS_PATH: f }));
    expect(seed.words.length).toBeGreaterThan(10);
  });

  it('server dùng danh sách seed', async () => {
    const f = path.join(os.tmpdir(), `tu-cam2-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify({ tuCam: [{ tu: 'hoa quỳnh' }] }));
    const s = await startServer({ BANNED_WORDS_PATH: f });
    const { c } = await s.hello();
    expect(await emitAck(c, 'release_lantern', { text: 'tặng hoa quỳnh', color: 'red' })).toMatchObject({ ok: false, code: 'content_rejected' });
    await s.close();
  });
});
