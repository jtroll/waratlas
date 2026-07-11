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

  // Cache-first for our data files.
  //
  // CACHE_NAME is a content hash of exactly these files (stamped at build
  // time by scripts/generate-sw.mjs), so a new deploy that changes any data
  // file produces a new cache name — the install handler then re-fetches the
  // fresh bodies once, and the activate handler sweeps the old cache. That
  // versioning already guarantees freshness, which means we do NOT need to
  // revalidate on every request.
  //
  // The previous implementation fired a `cache: 'reload'` background fetch on
  // *every* page view for *every* data file — a forced origin round-trip that
  // bypassed both the SW cache and the browser HTTP cache. With ~18MB of data
  // files, that turned each repeat visit and in-app navigation into a full
  // re-download and was the dominant driver of Vercel egress. Cache-first
  // means a returning visitor within the same deploy transfers zero bytes for
  // these files; they only re-download when the content actually changes.
  if (DATA_URLS.some((p) => url.pathname.endsWith(p))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        // Cache miss (first load under this CACHE_NAME): fetch once and store.
        const network = await fetch(event.request);
        if (network && network.ok) cache.put(event.request, network.clone());
        return network;
      })
    );
    return;
  }
});
