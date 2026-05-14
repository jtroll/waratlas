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
  // Pre-cache data files on first install.
  //
  // We construct Request objects with cache: 'reload' so each fetch goes
  // straight to origin and bypasses the browser's HTTP cache. Without
  // this, a returning visitor whose HTTP cache still holds the previous
  // build's empires.json (Cache-Control: max-age=86400, so up to 24h)
  // will pre-populate the new SW cache with stale data — even though
  // CACHE_NAME bumped, the contents under it are still old. The user
  // then sees the previous build's data until either the HTTP cache
  // expires or they hard-refresh. cache:'reload' fixes that.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        DATA_URLS.map((u) =>
          fetch(new Request(u, { cache: 'reload' }))
            .then((r) => (r && r.ok ? cache.put(u, r) : null))
            .catch(() => null)
        )
      )
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

  // Stale-while-revalidate for our data files. The background revalidate
  // uses cache: 'reload' for the same reason as install — to bypass the
  // browser HTTP cache, which would otherwise keep returning the previous
  // build's body for up to 24h after a new deploy and overwrite our SW
  // cache with stale data on every page load.
  if (DATA_URLS.some((p) => url.pathname.endsWith(p))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const network = fetch(new Request(event.request, { cache: 'reload' }))
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
