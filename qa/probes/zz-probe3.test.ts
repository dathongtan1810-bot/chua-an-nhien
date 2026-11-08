import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { startServer, newUser, Client, getJson, postJson, sleep } from '../lib/harness';
test('probe3', async () => {
  const s = await startServer({ MAX_CONN_PER_IP: '200', TRUST_PROXY: '1' });
  const out: string[] = [];
  const log = (...a: unknown[]) => out.push(a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
  const ipc = (i: number) => ({ headers: { 'x-forwarded-for': `10.0.0.${i}` } });
  const author = await newUser(s.url, 'Tác giả', undefined, ipc(1));
  const a = await author.emit('release_lantern', { text: 'Cầu bình an', color: 'vang' });
  log('lantern', a);
  // like race
  const likers = await Promise.all(Array.from({ length: 10 }, (_, i) => newUser(s.url, null, undefined, ipc(20 + i))));
  const acks = await Promise.all(likers.map((c) => c.emit('like_lantern', { id: a.id })));
  log('like acks', acks.map((x) => x.likes));
  await sleep(300);
  log('author saw likes', author.got('lantern_liked').map((x) => x.likes));
  const rest = await getJson(`${s.url}/api/lanterns`);
  log('rest likes', rest.body.lanterns.map((l: any) => l.likes));
  // delete one liker -> likes decrement?
  const d = await postJson(`${s.url}/api/me/delete`, { deviceId: likers[0]!.deviceId }, { 'x-forwarded-for': '10.0.0.20' });
  log('delete liker', d.status, d.body);
  await sleep(200);
  log('liker0 connected after delete', likers[0]!.socket.connected);
  log('rest likes after', (await getJson(`${s.url}/api/lanterns`)).body.lanterns.map((l: any) => l.likes));
  // report 3 distinct IPs
  const rs = [];
  for (let i = 0; i < 3; i++) rs.push(await likers[1 + i]!.emit('report', { type: 'lantern', id: a.id, reason: 'spam' }));
  log('reports', rs);
  await sleep(200);
  log('removed seen by liker5', likers[5]!.got('lantern_removed'));
  log('rest after report', (await getJson(`${s.url}/api/lanterns`)).body.lanterns.length);
  // author sees own hidden lantern? author lanterns_removed
  log('author got removed', author.got('lantern_removed'));
  // delete author: others get lantern_removed? (already hidden). new lantern then delete
  const b = await author.emit('release_lantern', { text: 'Đèn thứ hai', color: 'hong' });
  log('lantern2', b);
  await sleep(100);
  const del = await postJson(`${s.url}/api/me/delete`, { deviceId: author.deviceId }, { 'x-forwarded-for': '10.0.0.1' });
  log('delete author', del.body);
  await sleep(200);
  log('liker6 removed events', likers[6]!.got('lantern_removed'));
  log('rest after delete', (await getJson(`${s.url}/api/lanterns`)).body.lanterns.length);
  // rehello after delete
  const again = new Client(s.url, author.deviceId, ipc(1)); const w = await again.hello('Tác giả');
  log('rehello', w.userId, 'old', author.welcome.userId, 'incense', w.incense.length);
  // multi tab presence
  const t1 = await newUser(s.url, 'Tab', 'qa-same-device-0001', ipc(50));
  const t2 = await newUser(s.url, 'Tab', 'qa-same-device-0001', ipc(50));
  await t1.emit('enter_area', { area: 'san' }); await t2.emit('enter_area', { area: 'ho-sen' });
  await sleep(700);
  log('health', (await getJson(`${s.url}/api/health`)).body.online, 'stats', (await getJson(`${s.url}/api/stats`)).body.areas);
  // XFF spoof: with TRUST_PROXY=1, client set XFF "1.1.1.1, 2.2.2.2" -> which used
  // bell
  const b1 = await likers[7]!.emit('ring_bell', { force: 1 });
  const b2 = await likers[8]!.emit('ring_bell', { force: 1 });
  log('bells', b1, b2);
  // incense count stats
  const inc = await likers[7]!.emit('light_incense', { count: 9 });
  const inc2 = await likers[7]!.emit('light_incense', { count: 3 });
  log('incense', inc, inc2);
  writeFileSync('.tmp/probe3.txt', out.join('\n'));
  await s.stop();
}, 300000);
