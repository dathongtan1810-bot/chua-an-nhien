import { describe, expect, it } from 'vitest';
import { canOfferRewardedAd } from '../src/ads/rewarded';
import { initialState, reduce } from '../src/core/state';

const base = { enabled: true, native: true, area: 'san' as const, ritualActive: false, watchedToday: 0 };

describe('quảng cáo thưởng', () => {
  it('chỉ khi bật cờ, trên app, ngoài khu trang nghiêm, không trong nghi thức, chưa quá trần', () => {
    expect(canOfferRewardedAd(base)).toBe(true);
    expect(canOfferRewardedAd({ ...base, enabled: false })).toBe(false);
    expect(canOfferRewardedAd({ ...base, native: false })).toBe(false);
    expect(canOfferRewardedAd({ ...base, area: 'chinh-dien' })).toBe(false);
    expect(canOfferRewardedAd({ ...base, area: 'thien-duong' })).toBe(false);
    expect(canOfferRewardedAd({ ...base, ritualActive: true })).toBe(false);
    expect(canOfferRewardedAd({ ...base, watchedToday: 3 })).toBe(false);
  });
  it('reducer: +5 Hạt sen mỗi lần, tối đa 3 lần/ngày, sang ngày mới đếm lại', () => {
    let s = initialState('d', 'n', '2026-11-06');
    for (let i = 0; i < 5; i++) s = reduce(s, { type: 'adReward', dateKey: '2026-11-06', perDay: 3, seeds: 5 }).state;
    expect(s.hatSen).toBe(15);
    expect(s.daily.adRewards).toBe(3);
    s = reduce(s, { type: 'adReward', dateKey: '2026-11-07', perDay: 3, seeds: 5 }).state;
    expect(s.hatSen).toBe(20);
    expect(s.daily.adRewards).toBe(1);
  });
});
