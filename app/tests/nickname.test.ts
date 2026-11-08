import { describe, expect, it } from 'vitest';
import {
  NICK_ADJ_VI,
  NICK_NATURE_VI,
  NICK_TITLES_VI,
  randomNickname,
  randomNicknameEn,
} from '../src/logic/nickname';
import { checkText } from '../src/logic/filter';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('nickname', () => {
  it('has enough combinations', () => {
    expect(NICK_TITLES_VI.length * NICK_NATURE_VI.length * NICK_ADJ_VI.length).toBeGreaterThanOrEqual(10 * 15 * 10);
  });

  it('builds "<title> <nature> <adj>"', () => {
    const n = randomNickname(() => 0);
    expect(n).toBe(`${NICK_TITLES_VI[0]} ${NICK_NATURE_VI[0]} ${NICK_ADJ_VI[0]}`);
    const last = randomNickname(() => 0.9999999);
    expect(last.startsWith(NICK_TITLES_VI[NICK_TITLES_VI.length - 1] as string)).toBe(true);
  });

  it('produces varied, clean names', () => {
    const r = seeded(42);
    const set = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const n = randomNickname(r);
      set.add(n);
      expect(checkText(n).ok).toBe(true);
      expect(n.split(' ').length).toBeGreaterThanOrEqual(3);
    }
    expect(set.size).toBeGreaterThan(300);
  });

  it('never repeats the same word as nature and adjective', () => {
    const seq = [0, (NICK_NATURE_VI.indexOf('Mai') + 0.5) / NICK_NATURE_VI.length, (NICK_ADJ_VI.indexOf('Mai') + 0.5) / NICK_ADJ_VI.length, 0];
    let i = 0;
    const n = randomNickname(() => seq[i++ % seq.length] as number);
    expect(n.split(' ').slice(-2)).not.toEqual(['Mai', 'Mai']);
  });

  it('English variant', () => {
    expect(randomNicknameEn(() => 0)).toBe('Wanderer of Pink Lotus');
    const r = seeded(7);
    for (let i = 0; i < 100; i++) expect(randomNicknameEn(r)).toMatch(/^\w+ of \w+ \w+$/);
  });
});
