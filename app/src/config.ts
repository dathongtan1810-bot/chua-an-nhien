/** Cờ cấu hình build (đặt qua biến môi trường Vite: VITE_*). */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const flag = (v: string | undefined, def: boolean) => (v === undefined || v === '' ? def : v === 'true' || v === '1');

export const SERVER_URL: string = env.VITE_SERVER_URL ?? '';
/** Bật/tắt toàn bộ tính năng online (presence, hương/chuông/đèn chung). */
export const ONLINE_FEATURES: boolean = flag(env.VITE_ONLINE_FEATURES, true);
/** Dùng MockServer chạy trong trình duyệt (dev / chơi offline). Mặc định bật khi chưa có SERVER_URL. */
export const USE_MOCK_SERVER: boolean = flag(env.VITE_USE_MOCK_SERVER, SERVER_URL === '');
/** Quảng cáo thưởng (AdMob) — TẮT mặc định. Không bao giờ hiện ở chính điện / thiền đường. */
export const ADS_ENABLED: boolean = flag(env.VITE_ADS_ENABLED, false);
/** AdMob test IDs chính thức của Google (chỉ để thử nghiệm). */
export const ADMOB_TEST_IDS = {
  appAndroid: 'ca-app-pub-3940256099942544~3347511713',
  appIos: 'ca-app-pub-3940256099942544~1458002511',
  rewardedAndroid: 'ca-app-pub-3940256099942544/5224354917',
  rewardedIos: 'ca-app-pub-3940256099942544/1712485313',
} as const;
/** Số lần xem quảng cáo thưởng tối đa mỗi ngày và Hạt sen mỗi lần. */
export const AD_REWARD_PER_DAY = 3;
export const AD_REWARD_SEEDS = 5;
export const APP_NAME = 'Chùa An Nhiên';
export const PUBLIC_URL: string = env.VITE_PUBLIC_URL ?? 'https://chua-an-nhien.app';
