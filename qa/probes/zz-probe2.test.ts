import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { startServer, newUser, Client, getJson, postJson, sleep } from '../lib/harness';
test('probe2', async () => {
  const s = await startServer({ MAX_CONN_PER_IP: '200' });
  const out: string[] = [];
  const log = (...a: unknown[]) => out.push(a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
  // nicknames
  for (const n of ['Địt Mẹ', 'ｄｉｔ', 'zalo 0912345678', 'fb.com/abc', '<img src=x onerror=alert(1)>', '   ', '‮abc', 'a'.repeat(24), 'Admin', 'Quản trị viên', 'Sư thầy', '𝐝𝐢𝐭 𝐦𝐞', 'dіt mе' /*cyrillic*/]) {
    const c = new Client(s.url); await c.connect();
    const a = await c.emit('hello', { deviceId: c.deviceId, nickname: n, lang: 'vi' });
    await sleep(50);
    log('nick', n, '->', a.ok ? c.got('welcome')[0]?.nickname : a);
    c.close();
  }
  await s.restart();
  for (const t of ['𝐝𝐢𝐭 𝐦𝐞 𝐦𝐚𝐲', 'dіt mе mày' , 'đ-i-t m-e', 'điiiiit mẹ', 'd1t m3', 'Ðịt mẹ', 'ĐỊT MẸ', 'đ̣it', 'đ ị t m ẹ m à y', 'dit-me', 'ditme', 'đitme', 'đ_i_t', 'đ😀ị😀t', '<script>alert(1)</script>', 'x'.repeat(121), '😀'.repeat(120), 'á'.repeat(100), '   ', '\n\n\n']) {
    const c = await newUser(s.url);
    const a = await c.emit('release_lantern', { text: t, color: 'vang' });
    log('lantern', t.slice(0, 40), t.length, '->', a);
    c.close();
  }
  writeFileSync('.tmp/probe2.txt', out.join('\n'));
  await s.stop();
}, 300000);
