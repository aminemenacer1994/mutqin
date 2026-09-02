const SHELL_CACHE = 'mutqin-shell-v84';
const RUNTIME_CACHE = 'mutqin-runtime-v84';

// Precache icons/manifest only — never HTML shells (stale HTML → deleted Mix chunks).
const SHELL_URLS = [
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

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data === 'SKIP_WAITING' || data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data === 'CLEAR_CACHES' || data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
    );
  }
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

async function cacheFirstHashedAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isDocument = request.mode === 'navigate' || request.destination === 'document';
  const isSameOrigin = url.origin === self.location.origin;
  const isHashedBuildAsset = isSameOrigin && (
    /\.[a-f0-9]{8}\.js$/i.test(url.pathname)
    || /\.[a-f0-9]{8}\.css$/i.test(url.pathname)
  );
  const isEntryBuildAsset = isSameOrigin && (
    url.pathname === '/js/app.js'
    || url.pathname === '/css/app.css'
    || url.pathname === '/mix-manifest.json'
    || url.pathname === '/sw.js'
  );
  const isAudio = request.destination === 'audio' || /audio|mp3|opus|webm/i.test(url.pathname);
  const isQuranApi = /api\.quran\.com|api\.alquran\.cloud|cdn\.islamic\.network/i.test(url.host);
  const isManifestOrIcon = isSameOrigin && (
    url.pathname === '/manifest.webmanifest'
    || url.pathname.startsWith('/icons/')
  );

  // HTML must always hit the network so Mix entry ?id= hashes stay current.
  if (isDocument) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Entry bundles + manifest rewrite in place — never long-cache via SW.
  if (isEntryBuildAsset) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Contenthashed chunks are immutable — cache-first is safe.
  if (isHashedBuildAsset) {
    event.respondWith(cacheFirstHashedAsset(request));
    return;
  }

  if (isManifestOrIcon) {
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
