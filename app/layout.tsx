import type { Metadata, Viewport } from 'next';
import { Source_Serif_4, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';
import stats from '@/lib/generated/stats.json';
import { getSiteUrl } from '@/lib/site-url';
import { DATA_URLS } from '@/lib/data-urls';

/**
 * Editorial type families per redesign handoff.
 *   - Source Serif 4: empire and conflict names, narrative body
 *   - Inter Tight:    UI labels, chrome
 *   - JetBrains Mono: data, IDs, coordinates, ticks
 *
 * Each one is exposed as a CSS variable so non-React surfaces (globals.css,
 * Mapbox text-font property) can reach the same families.
 */
// Weights: 400/500 for display + body, 700 for <strong> inside the serif prose
// on /sources and /changelog. 600 is not used anywhere in serif.
const serif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '700'],
  variable: '--font-display',
  display: 'swap',
})
const sans = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

// Headline statistics — derived from the data files by
// scripts/build-data.mjs (runs in `predev` / `prebuild` / `npm run data`).
const STAT_CONFLICTS = stats.conflicts.toLocaleString('en-US');
const STAT_EMPIRES = stats.empires.toLocaleString('en-US');

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'War Atlas — Every Named War in Human History',
  description: `An interactive cartography of ${STAT_CONFLICTS} recorded military conflicts across 5,000 years of human history, with ${STAT_EMPIRES} historical empire borders, casualty estimate ranges, and era-by-era timeline navigation.`,
  keywords: ['wars', 'military history', 'conflicts', 'interactive map', 'world history', 'atlas', 'battles', 'empires'],
  authors: [{ name: 'War Atlas' }],
  openGraph: {
    title: 'War Atlas — Every Named War in Human History',
    description: `Explore 5,000 years of conflict on an interactive world map. ${STAT_CONFLICTS} wars, ${STAT_EMPIRES} empire borders with shifting frontiers, casualty estimates with sources.`,
    type: 'website',
    siteName: 'War Atlas',
    locale: 'en_US',
    url: '/',
    images: [
      // Single PNG, renamed from og-image.png to og-card.png so Facebook's
      // scraper sees a never-before-cached URL. (FB has a long-standing
      // history of caching "image fetch failed" against URLs and refusing
      // to re-fetch even after the underlying image becomes available;
      // renaming bypasses that.) Dropped the SVG entry — FB doesn't render
      // SVG OG images, and a second og:image tag has been known to confuse
      // their parser into showing the link as a plain card with no image.
      { url: '/og-card.png', width: 1200, height: 630, alt: 'War Atlas — interactive map of every named war in human history', type: 'image/png' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'War Atlas — Every Named War in Human History',
    description: `Explore ${STAT_CONFLICTS} wars and ${STAT_EMPIRES} empires across 5,000 years on an interactive world map.`,
    images: ['/og-card.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
}

// Viewport: scaling is intentionally NOT locked. Disabling user-scalable
// breaks WCAG 2.1 SC 1.4.4 (Resize Text) for low-vision users.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06090f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        {/* Preconnect to Mapbox so the style + tile fetches start their DNS /
            TLS handshake during HTML parse. (mapbox-gl.css is bundled from the
            npm package, so the version always matches the JS.) */}
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        {/* Start the two big first-paint datasets downloading before the JS
            bundle has parsed. crossOrigin="anonymous" is required for
            as="fetch" preloads: fetch() runs in CORS mode with same-origin
            credentials, and without the attribute the preload's credentials
            mode differs, the browser discards it, and each file downloads
            twice (observed in Chromium). */}
        <link rel="preload" as="fetch" href={DATA_URLS.conflictsCore} crossOrigin="anonymous" />
        <link rel="preload" as="fetch" href={DATA_URLS.empires} crossOrigin="anonymous" />
        {/* Site-wide structured data: WebSite + Dataset. Tells Google
            this domain is a single search-targetable site, and that the
            underlying conflict + empire records are a publicly available
            dataset (which is the schema Google Dataset Search uses). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: 'War Atlas',
                  description: `An interactive cartography of ${STAT_CONFLICTS} recorded military conflicts across 5,000 years of human history.`,
                  inLanguage: 'en',
                },
                {
                  '@type': 'Dataset',
                  '@id': `${SITE_URL}/#dataset`,
                  name: 'War Atlas: Named Conflicts and Empire Borders, 3000 BCE – Present',
                  description: `${STAT_CONFLICTS} named military conflicts and ${STAT_EMPIRES} historical empire border polygons spanning 5,000 years, with casualty estimate ranges and primary-source citations.`,
                  url: SITE_URL,
                  creator: { '@type': 'Organization', name: 'War Atlas' },
                  isAccessibleForFree: true,
                  keywords: 'wars, military history, conflicts, empires, historical atlas, casualties',
                },
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased font-ui">
        {children}
        {/* Vercel Web Analytics (cookieless, no PII) + Speed Insights (Core Web Vitals).
            Both auto-detect environment: production sends events to Vercel, dev/preview
            log to console. Free tier covers ~2.5k events/mo. Enable in Vercel project
            dashboard under Analytics + Speed Insights tabs, then redeploy. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
