import { MetadataRoute } from 'next';

/**
 * Web App Manifest — makes the site installable as a PWA on mobile and
 * Chromium desktops. The service worker (public/sw.js) handles the offline
 * caching half of the PWA contract; this file handles the install-prompt
 * + standalone-window half.
 *
 * Icon note: we currently expose favicon.svg as the install icon with
 * `purpose: "any"`. SVG icons in manifests are supported by Chrome,
 * Edge, and Firefox but NOT iOS Safari's "Add to Home Screen" — iOS
 * falls back to a screenshot. To fix iOS, add public/icon-192.png and
 * public/icon-512.png (purpose "any maskable") and add entries here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'War Atlas — Every Named War in Human History',
    short_name: 'War Atlas',
    description:
      'An interactive cartography of recorded military conflicts across 5,000 years of human history, with historical empire borders, casualty estimate ranges, and era-by-era timeline navigation.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#06090f',
    theme_color: '#06090f',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['education', 'reference', 'maps'],
  };
}
