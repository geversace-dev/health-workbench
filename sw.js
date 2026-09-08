const CACHE = 'calm-health-v6';
const APP_FILES = [
  './', './index.html', './styles.css', './calendar-plus.css', './app.js',
  './calendar-plus.js', './health-import.js', './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key !== CACHE)
      .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// 网络优先：发布新版本后手机不会继续卡在旧的导入逻辑。
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (new URL(event.request.url).origin === self.location.origin) {
          caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
