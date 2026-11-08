import { describe, expect, it } from 'vitest';
import { hydrate, initialState, reduce, RITUAL_DAILY_CAP } from '../src/core/state';

const D = '2026-11-05';
const base = () => initialState('dev-1', 'Lữ khách Sen Hồng', D);

describe('reducer', () => {
  it('thắp hương hoàn thành nhiệm vụ và thưởng hạt sen', () => {
    const { state, reward } = reduce(base(), { type: 'ritual', kind: 'incense', amount: 3, dateKey: D });
    expect(state.totals.incense).toBe(3);
    expect(state.daily.quests['thap-huong']).toBe(true);
    expect(reward.amount).toBe(1 + 3);
    expect(state.hatSen).toBe(4);
    expect(state.streak.count).toBe(1);
  });

  it('thiền đủ 3 phút mới xong nhiệm vụ', () => {
    let s = reduce(base(), { type: 'ritual', kind: 'meditation', amount: 1, dateKey: D }).state;
    expect(s.daily.quests['thien-3']).toBe(false);
    s = reduce(s, { type: 'ritual', kind: 'meditation', amount: 3, dateKey: D }).state;
    expect(s.daily.quests['thien-3']).toBe(true);
  });

  it('thưởng hoàn thành cả 3 nhiệm vụ đúng một lần', () => {
    let s = base();
    s = reduce(s, { type: 'ritual', kind: 'incense', dateKey: D }).state;
    s = reduce(s, { type: 'ritual', kind: 'lantern', dateKey: D }).state;
    const r = reduce(s, { type: 'ritual', kind: 'meditation', amount: 3, dateKey: D });
    expect(r.reward.reasons).toContain('allQuests');
    const r2 = reduce(r.state, { type: 'ritual', kind: 'lantern', dateKey: D });
    expect(r2.reward.reasons).not.toContain('allQuests');
  });

  it('có trần thưởng nghi thức mỗi ngày; mõ/hạt chuỗi không thưởng lẻ', () => {
    let s = base();
    for (let i = 0; i < 50; i++) s = reduce(s, { type: 'ritual', kind: 'bow', dateKey: D }).state;
    expect(s.daily.ritualRewards).toBe(RITUAL_DAILY_CAP);
    const r = reduce(s, { type: 'ritual', kind: 'mo', dateKey: '2026-11-06' });
    expect(r.reward.amount).toBe(0);
    expect(r.state.daily.dateKey).toBe('2026-11-06');
  });

  it('nhiệm vụ sự kiện thưởng một lần', () => {
    const r = reduce(base(), { type: 'ritual', kind: 'lantern', dateKey: D, eventRitual: 'lantern' });
    expect(r.reward.reasons).toContain('event');
    const r2 = reduce(r.state, { type: 'ritual', kind: 'lantern', dateKey: D, eventRitual: 'lantern' });
    expect(r2.reward.reasons).not.toContain('event');
  });

  it('mua và trang bị đồ trang trí', () => {
    let s = { ...base(), hatSen: 30 };
    s = reduce(s, { type: 'buy', itemId: 'incense-sen' }).state;
    expect(s.hatSen).toBe(5);
    expect(s.equipped.incense).toBe('incense-sen');
    const again = reduce(s, { type: 'buy', itemId: 'lantern-tron' }).state;
    expect(again.owned).not.toContain('lantern-tron');
    s = reduce(s, { type: 'equip', itemId: 'incense-tram' }).state;
    expect(s.equipped.incense).toBe('incense-tram');
  });

  it('hydrate giữ dữ liệu cũ và bổ sung trường mới', () => {
    const old = { ...base(), hatSen: 12 } as Record<string, unknown>;
    delete old.blocked;
    const s = hydrate(JSON.parse(JSON.stringify(old)), base());
    expect(s.hatSen).toBe(12);
    expect(s.blocked).toEqual([]);
    expect(hydrate(null, base()).hatSen).toBe(0);
  });
});
