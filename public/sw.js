// War Atlas service worker — caches data files and core JS bundle so the app
// works offline once visited. We deliberately do NOT shrink the data files
// (preserving every empire / conflict / city record) — instead we cache them
// aggressively after first load.

// CACHE_NAME is inserted at build time by scripts/generate-sw.mjs as a
// short sha1 of the four DATA_URLS files below, so any change to the
// underlying data automatically invalidates returning visitors' cached
// copies (the activate handler's GC pass below sweeps any cache whose
// name starts with `war-atlas-` or `wars-atlas-` and isn't current).
//
// The npm `prebuild` hook keeps Vercel + manual `next build` runs in
// sync. `next dev` skips this (SW isn't registered in dev — see
// ServiceWorkerRegistration.tsx), so it's fine for the git-tracked
// source to have no CACHE_NAME declaration at all.
//
// Earlier values: v1 ... v3 (manual bumps), v4 (manual, P4 border
// audit). Hash-stamped names since.
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
