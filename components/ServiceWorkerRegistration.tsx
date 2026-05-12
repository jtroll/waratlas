'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for offline / cached data support.
 * Renders nothing.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    const reg = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('War Atlas: SW registration failed', err);
      });
    return () => {
      // Don't unregister on unmount — we WANT the SW to persist across navigations
      void reg;
    };
  }, []);
  return null;
}
