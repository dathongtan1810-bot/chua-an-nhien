import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_MAX_MEMBERS = 20;
export const ROOM_IDLE_TTL_MS = 10 * 60_000;
export const MAX_ROOMS = 5000;

export interface Room {
  code: string;
  ownerId: string;
  members: Set<string>; // userId
  createdAt: number;
  emptySince: number | null;
}

/** Phòng riêng (đi chùa cùng gia đình) – chỉ trong bộ nhớ, tự huỷ khi trống quá 10 phút. */
export class Rooms {
  private rooms = new Map<string, Room>();
  private byUser = new Map<string, string>();

  newCode(): string {
    for (let i = 0; i < 50; i++) {
      let c = '';
      for (let j = 0; j < 6; j++) c += ALPHABET[randomInt(ALPHABET.length)];
      if (!this.rooms.has(c)) return c;
    }
    throw new Error('room_code_exhausted');
  }

  create(ownerId: string, now = Date.now()): Room | null {
    if (this.rooms.size >= MAX_ROOMS) return null;
    const room: Room = { code: this.newCode(), ownerId, members: new Set(), createdAt: now, emptySince: now };
    this.rooms.set(room.code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  roomOf(userId: string): Room | undefined {
    const c = this.byUser.get(userId);
    return c ? this.rooms.get(c) : undefined;
  }

  join(code: string, userId: string): { room?: Room; left?: Room; error?: 'room_not_found' | 'room_full' } {
    const room = this.rooms.get(code);
    if (!room) return { error: 'room_not_found' };
    if (room.members.has(userId)) return { room };
    if (room.members.size >= ROOM_MAX_MEMBERS) return { error: 'room_full' };
    const left = this.leave(userId);
    room.members.add(userId);
    room.emptySince = null;
    this.byUser.set(userId, code);
    return { room, left: left && left.code !== code ? left : undefined };
  }

  leave(userId: string, now = Date.now()): Room | undefined {
    const code = this.byUser.get(userId);
    if (!code) return undefined;
    this.byUser.delete(userId);
    const room = this.rooms.get(code);
    if (!room) return undefined;
    room.members.delete(userId);
    if (room.members.size === 0) room.emptySince = now;
    return room;
  }

  sweep(now = Date.now()): number {
    let n = 0;
    for (const [code, r] of this.rooms) {
      if (r.members.size === 0 && r.emptySince !== null && now - r.emptySince > ROOM_IDLE_TTL_MS) {
        this.rooms.delete(code);
        n++;
      }
    }
    return n;
  }

  get size(): number {
    return this.rooms.size;
  }
}
