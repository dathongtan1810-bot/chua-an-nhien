import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collect, emitAck, sleep, startServer, waitFor, type TestServer } from './helpers.js';
import { Rooms, ROOM_IDLE_TTL_MS, ROOM_MAX_MEMBERS } from '../src/services/rooms.js';
import { ROOM_CODE_REGEX } from '../../shared/protocol.js';

let s: TestServer;
beforeEach(async () => {
  s = await startServer();
});
afterEach(async () => {
  await s.close();
});

describe('phòng riêng (EXT)', () => {
  it('tạo, vào bằng mã (không phân biệt hoa thường), thấy khu của nhau', async () => {
    const a = await s.hello();
    const b = await s.hello();
    const st0 = waitFor(a.c, 'room_state');
    const r = await emitAck(a.c, 'room_create', {});
    expect(r.code).toMatch(ROOM_CODE_REGEX);
    expect((await st0).members.map((m) => m.userId)).toEqual([a.w.userId]);
    const st = waitFor(a.c, 'room_state');
    expect(await emitAck(b.c, 'room_join', { code: r.code.toLowerCase() })).toMatchObject({ ok: true, code: r.code });
    expect((await st).members).toHaveLength(2);
    const st2 = waitFor(a.c, 'room_state');
    b.c.emit('enter_area', { area: 'ho-sen' });
    const after = await st2;
    expect(after.members.find((m) => m.userId === b.w.userId)).toMatchObject({ area: 'ho-sen', nickname: b.w.nickname });
  });

  it('mã sai / không tồn tại', async () => {
    const a = await s.hello();
    expect(await emitAck(a.c, 'room_join', { code: 'abc' })).toMatchObject({ ok: false, code: 'invalid_payload' });
    expect(await emitAck(a.c, 'room_join', { code: 'ZZZZZZ' })).toMatchObject({ ok: false, code: 'room_not_found' });
  });

  it('rời phòng & người ngoài không nhận room_state', async () => {
    const a = await s.hello();
    const b = await s.hello();
    const out = await s.hello();
    const { code } = await emitAck(a.c, 'room_create', {});
    await emitAck(b.c, 'room_join', { code });
    const outside = collect(out.c, 'room_state', 300);
    const left = waitFor(b.c, 'room_left');
    const st = waitFor(a.c, 'room_state');
    await emitAck(b.c, 'room_leave', {});
    expect(await left).toEqual({ code });
    expect((await st).members).toHaveLength(1);
    expect(await outside).toHaveLength(0);
  });

  it('ngắt kết nối cuối → rời phòng; vào phòng mới tự rời phòng cũ', async () => {
    const a = await s.hello();
    const b = await s.hello();
    const { code: c1 } = await emitAck(a.c, 'room_create', {});
    await emitAck(b.c, 'room_join', { code: c1 });
    const st = waitFor(a.c, 'room_state');
    b.c.disconnect();
    expect((await st).members).toHaveLength(1);
    const left = waitFor(a.c, 'room_left');
    const { code: c2 } = await emitAck(a.c, 'room_create', {});
    expect(c2).not.toBe(c1);
    expect(await left).toEqual({ code: c1 });
    await sleep(10);
  });

  it('các sự kiện chung vẫn hoạt động trong phòng', async () => {
    const a = await s.hello();
    const b = await s.hello();
    const { code } = await emitAck(a.c, 'room_create', {});
    await emitAck(b.c, 'room_join', { code });
    const bell = waitFor(b.c, 'bell_rung');
    a.c.emit('ring_bell', { force: 0.5 });
    expect((await bell).force).toBe(0.5);
  });
});

describe('Rooms (unit)', () => {
  it('giới hạn thành viên & dọn phòng trống', () => {
    const r = new Rooms();
    const room = r.create('owner', 0)!;
    for (let i = 0; i < ROOM_MAX_MEMBERS; i++) expect(r.join(room.code, `u${i}`).error).toBeUndefined();
    expect(r.join(room.code, 'extra').error).toBe('room_full');
    for (let i = 0; i < ROOM_MAX_MEMBERS; i++) r.leave(`u${i}`, 1000);
    expect(r.sweep(1000 + ROOM_IDLE_TTL_MS - 1)).toBe(0);
    expect(r.sweep(1000 + ROOM_IDLE_TTL_MS + 1)).toBe(1);
    expect(r.size).toBe(0);
  });
});
