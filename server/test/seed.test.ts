import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSeedWords } from '../src/app.js';
import { testConfig } from '../src/config.js';
import { emitAck, startServer } from './helpers.js';

describe('seed từ cấm', () => {
  it('BANNED_WORDS_PATH định dạng tu-cam.json được gộp với mặc định', () => {
    const f = path.join(os.tmpdir(), `tu-cam-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify({ tuCam: [{ tu: 'hoa quỳnh', bienTheLach: ['hq'] }], allowlist: ['quỳnh hoa'], thayKyTu: { '9': 'g' } }));
    const seed = loadSeedWords(testConfig({ BANNED_WORDS_PATH: f }));
    expect(seed.words).toContain('hoa quỳnh');
    expect(seed.words).toContain('~hq');
    expect(seed.words).toContain('+quỳnh hoa');
    expect(seed.words).toContain('địt'); // vẫn có danh sách mặc định
    expect(seed.substitutions).toEqual({ '9': 'g' });
    expect(seed.source).toContain(path.basename(f));
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
