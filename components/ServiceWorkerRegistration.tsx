'use client';

import { useEffect } from 'react';

/**
 * Legacy service-worker cleanup. Renders nothing.
 *
 * The app no longer uses a service worker (data files are content-hashed and
 * served immutable instead). Visitors who installed the old caching worker
 * still need it removed, so if — and only if — a registration exists we
 * fetch /sw.js, which is now a kill-switch that deletes the old caches and
 * unregisters itself. Once that has happened there is no registration and
 * this effect is a no-op forever after.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        if (regs.length === 0) return undefined;
        return navigator.serviceWorker.register('/sw.js', { scope: '/' });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('War Atlas: legacy service worker cleanup failed', err);
      });
  }, []);
  return null;
}
