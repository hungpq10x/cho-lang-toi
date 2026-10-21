// Lưu sẵn các file của app để mở được cả khi mất mạng.
// Khi sửa code, tăng số phiên bản để máy người dùng tải bản mới.
const CACHE = 'cholangtoi-v1';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/store.js',
  'js/app.js',
  'js/order-form.js',
  'js/orders.js',
  'js/stats.js',
  'js/settings.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// File của app: trả bản đã lưu ngay, đồng thời tải bản mới ở nền.
// Ảnh QR (img.vietqr.io) luôn lấy từ mạng.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
