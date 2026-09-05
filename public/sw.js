// War Atlas kill-switch service worker.
//
// Earlier releases shipped a caching service worker (cache-first for the
// bulk JSON files under a `war-atlas-<hash>` cache). Data is now served from
// content-hashed, immutable URLs under /data/, so the worker is no longer
// needed. This replacement exists only so visitors who still have the old
// worker installed get cleaned up: it deletes the old caches, unregisters
// itself, and reloads any open tab that was being served by the old worker.
//
// It must stay at /sw.js (same URL as the old worker) so the browser's
// update check picks it up. Once every client has been through it there is
// no registration left, and ServiceWorkerRegistration.tsx never registers it
// again.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Take over pages controlled by the old worker so we can reload them.
      await self.clients.claim();

      const keys = await caches.keys();
      const stale = keys.filter((k) => k.startsWith('war-atlas-') || k.startsWith('wars-atlas-'));
      await Promise.all(stale.map((k) => caches.delete(k)));

      await self.registration.unregister();

      // Only reload when there was something to clean up: a fresh page that
      // (re)registers this worker with nothing cached must not loop.
      if (stale.length === 0) return;
      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.all(clients.map((c) => c.navigate(c.url).catch(() => null)));
    })(),
  );
});
