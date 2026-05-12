// War Atlas service worker — caches data files and core JS bundle so the app
// works offline once visited. We deliberately do NOT shrink the data files
// (preserving every empire / conflict / city record) — instead we cache them
// aggressively after first load.

// Bump CACHE_NAME on every deploy that changes any cached data file. The
// activate handler below garbage-collects old `wars-atlas-*` caches.
// Bumped to v3 alongside the "War Atlas" rename so old caches under the
// previous name get garbage-collected on next visit. The activate handler
// below kills any cache starting with `wars-atlas-` or older `war-atlas-`.
//
// v4 (2026-05-12): P4 border audit. Replaces stale `empires.json` for
// returning visitors whose SW had cached the pre-audit polygon set
// (Xiongnu lens, Adena 7-vert hexagon, Maurya/Khazar/Khmer marked
// approximate, etc). Bumping the cache name causes the activate handler
// below to garbage-collect `war-atlas-v3` and pre-fetch the new file.
const CACHE_NAME = 'war-atlas-v4';
const DATA_URLS = [
  '/empires.json',
  '/cities.json',
  '/conflicts.json',
  '/empire-wikipedia.json',
];

self.addEventListener('install', (event) => {
  // Pre-cache data files on first install
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(DATA_URLS).catch(() => {
        // OK to fail; we'll fetch on demand
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME && (k.startsWith('wars-atlas-') || k.startsWith('war-atlas-'))).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only intercept GETs to our own origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Stale-while-revalidate for our data files
  if (DATA_URLS.some((p) => url.pathname.endsWith(p))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const network = fetch(event.request)
          .then((r) => {
            if (r && r.ok) cache.put(event.request, r.clone());
            return r;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});
