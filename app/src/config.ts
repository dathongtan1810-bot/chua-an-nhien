/** Cờ cấu hình build (đặt qua biến môi trường Vite: VITE_*). */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const flag = (v: string | undefined, def: boolean) => (v === undefined || v === '' ? def : v === 'true' || v === '1');

export const SERVER_URL: string = env.VITE_SERVER_URL ?? '';
/** Bật/tắt toàn bộ tính năng online (presence, hương/chuông/đèn chung). */
export const ONLINE_FEATURES: boolean = flag(env.VITE_ONLINE_FEATURES, true);
/** Dùng MockServer chạy trong trình duyệt (dev / chơi offline). Mặc định bật khi chưa có SERVER_URL. */
export const USE_MOCK_SERVER: boolean = flag(env.VITE_USE_MOCK_SERVER, SERVER_URL === '');
export const APP_NAME = 'Chùa An Nhiên';
export const PUBLIC_URL: string = env.VITE_PUBLIC_URL ?? 'https://chua-an-nhien.app';
