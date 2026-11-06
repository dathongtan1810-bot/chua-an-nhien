/**
 * Quảng cáo thưởng (AdMob) — TẮT mặc định (VITE_ADS_ENABLED), chỉ trên app điện thoại, chỉ ID thử nghiệm.
 * Nguyên tắc: người chơi tự bấm xem; không bao giờ ở chính điện / thiền đường / khi đang làm nghi thức;
 * quảng cáo không cá nhân hóa (npa); thưởng Hạt sen có trần mỗi ngày.
 */
import { AD_REWARD_PER_DAY, ADMOB_TEST_IDS, ADS_ENABLED } from '../config';
import { AREA_INFO, type AreaId } from '../core/areas';

export interface AdContext {
  enabled: boolean;
  native: boolean;
  area: AreaId;
  ritualActive: boolean;
  watchedToday: number;
}

/** Có được hiện nút "xem quảng cáo nhận Hạt sen" không (hàm thuần, có test). */
export function canOfferRewardedAd(c: AdContext): boolean {
  return c.enabled && c.native && !AREA_INFO[c.area].solemn && !c.ritualActive && c.watchedToday < AD_REWARD_PER_DAY;
}

type Platform = 'android' | 'ios' | 'web';
function platform(): Platform {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  return p === 'android' || p === 'ios' ? p : 'web';
}

export function isNativeApp(): boolean {
  return platform() !== 'web';
}

export function adsEnabled(): boolean {
  return ADS_ENABLED;
}

let initialized: Promise<void> | null = null;

/**
 * Hiện một quảng cáo thưởng. Trả về true khi người chơi xem xong và được thưởng.
 * Không ném lỗi: lỗi tải/hiện quảng cáo → false.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!ADS_ENABLED || !isNativeApp()) return false;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    initialized ??= AdMob.initialize({ initializeForTesting: true });
    await initialized;
    const adId = platform() === 'ios' ? ADMOB_TEST_IDS.rewardedIos : ADMOB_TEST_IDS.rewardedAndroid;
    await AdMob.prepareRewardVideoAd({ adId, isTesting: true, npa: true });
    const item = await AdMob.showRewardVideoAd();
    return !!item && (item.amount ?? 0) >= 0;
  } catch {
    initialized = null;
    return false;
  }
}
