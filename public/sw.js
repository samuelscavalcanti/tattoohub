const CACHE_NAME = 'tattoohub-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/anamnese.html',
  '/manifest.webmanifest',
  '/css/dashboard.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/main.js',
  '/js/pwa.js',
  '/js/ui.js',
  '/js/public-anamnese.js',
  '/js/modules/agenda.js',
  '/js/modules/anamnese.js',
  '/js/modules/clients.js',
  '/js/modules/crm.js',
  '/js/modules/dashboard.js',
  '/js/modules/operations.js',
  '/js/modules/settings.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
const APP_SHELL_PATHS = new Set(APP_SHELL.map((path) => new URL(path, self.location.origin).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('tattoohub-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('/'));
      })
    );
    return;
  }

  if (!APP_SHELL_PATHS.has(url.pathname)) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then((cached) => cached || fetch(request))
  );
});
