const SHELL_CACHE = 'mutqin-shell-v61';
const RUNTIME_CACHE = 'mutqin-runtime-v61';
// Do NOT precache /memorisation — stale HTML shells freeze AI Recite UI updates.
const SHELL_URLS = [
  '/',
  '/login',
  '/register',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
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
        .filter(key => ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

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
  const isBuildAsset = isSameOrigin && (
    /^\/js\//.test(url.pathname)
    || /^\/css\//.test(url.pathname)
    || url.searchParams.has('id')
  );
  const isAudio = request.destination === 'audio' || /audio|mp3|opus|webm/i.test(url.pathname);
  const isQuranApi = /api\.quran\.com|api\.alquran\.cloud|cdn\.islamic\.network/i.test(url.host);
  const isManifestOrIcon = isSameOrigin && (
    url.pathname === '/manifest.webmanifest'
    || url.pathname.startsWith('/icons/')
  );
  const isMemorisationDoc = isSameOrigin && (
    url.pathname === '/memorisation'
    || url.pathname.startsWith('/memorisation/')
  );

  if (isBuildAsset) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Always network-only for memorisation HTML so AI Recite UI never freezes on a shell.
  if (isDocument && isMemorisationDoc) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (isManifestOrIcon) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  if (isDocument) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  if (isAudio || url.host === 'cdn.islamic.network') {
    event.respondWith(fetch(request));
    return;
  }

  if (isSameOrigin || isQuranApi) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
  }
});
