/** Đăng ký service worker (chơi offline). Bỏ qua trên Capacitor native & khi dev. */
export function registerSW(): void {
  const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  if (isNative || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* không hỗ trợ */
    });
  });
}
