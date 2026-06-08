const SHELL_CACHE = 'mutqin-shell-v4';
const RUNTIME_CACHE = 'mutqin-runtime-v4';
const AUDIO_CACHE = 'mutqin-audio-v1';
const SHELL_URLS = [
  '/',
  '/memorisation',
  '/login',
  '/register',
  '/favicon.ico',
  '/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => ![SHELL_CACHE, RUNTIME_CACHE, AUDIO_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isDocument = request.mode === 'navigate';
  const isSameOrigin = url.origin === self.location.origin;
  const isBuildAsset = isSameOrigin && (/^\/js\/app\.js/.test(url.pathname) || /^\/css\/app\.css/.test(url.pathname) || url.searchParams.has('id'));
  const isAudio = request.destination === 'audio' || /audio|mp3|opus|webm/i.test(url.pathname);
  const isQuranApi = /api\.quran\.com|api\.alquran\.cloud|cdn\.islamic\.network/i.test(url.host);

  if (isBuildAsset) {
    event.respondWith(fetch(request));
    return;
  }

  if (isDocument) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  if (isAudio || url.host === 'cdn.islamic.network') {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  if (isSameOrigin || isQuranApi) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
  }
});
