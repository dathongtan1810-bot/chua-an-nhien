/* Service worker Chùa An Nhiên — chơi được offline.
 * Điều hướng: network-first (fallback bản đã lưu). Tài nguyên cùng origin: stale-while-revalidate.
 * Không cache API / socket.io. */
// Mã build được thay khi build (vite.config.ts) → mỗi bản phát hành có cache riêng, bản cũ bị dọn
const CACHE = 'chua-an-nhien-__BUILD_ID__';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => undefined)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/') || url.pathname.includes('/socket.io/')) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // chỉ lưu vỏ app (index), không lưu privacy.html hay trang lỗi
          const p = url.pathname;
          const isShell = p.endsWith('/') || p.endsWith('/index.html');
          if (res.ok && isShell) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    }),
  );
});
