import type { Metadata, Viewport } from 'next';
import { Source_Serif_4, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/**
 * Editorial type families per redesign handoff.
 *   - Source Serif 4: empire and conflict names, narrative body
 *   - Inter Tight:    UI labels, chrome
 *   - JetBrains Mono: data, IDs, coordinates, ticks
 *
 * Each one is exposed as a CSS variable so non-React surfaces (globals.css,
 * Mapbox text-font property) can reach the same families.
 */
const serif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
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

// Headline statistics — keep in sync with public/conflicts.json + public/empires.json
// counts. AboutModal reads the same numbers; if you bump these here, bump them there too.
const STAT_CONFLICTS = '1,340';
const STAT_EMPIRES = '372';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wars-atlas.example';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Wars Atlas — Every Named War in Human History',
  description: `An interactive cartography of ${STAT_CONFLICTS} recorded military conflicts across 5,000 years of human history, with ${STAT_EMPIRES} historical empire borders, casualty estimate ranges, and era-by-era timeline navigation.`,
  keywords: ['wars', 'military history', 'conflicts', 'interactive map', 'world history', 'atlas', 'battles', 'empires'],
  authors: [{ name: 'Wars Atlas' }],
  openGraph: {
    title: 'Wars Atlas — Every Named War in Human History',
    description: `Explore 5,000 years of conflict on an interactive world map. ${STAT_CONFLICTS} wars, ${STAT_EMPIRES} empire borders with shifting frontiers, casualty estimates with sources.`,
    type: 'website',
    siteName: 'Wars Atlas',
    locale: 'en_US',
    url: '/',
    images: [
      // PNG primary for maximum platform compatibility (LinkedIn, older Twitter
      // renderers); SVG kept as a secondary so vector-aware platforms get a
      // sharper render. Both are 1200×630.
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Wars Atlas — interactive map of every named war in human history', type: 'image/png' },
      { url: '/og-image.svg', width: 1200, height: 630, alt: 'Wars Atlas — interactive map of every named war in human history', type: 'image/svg+xml' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wars Atlas — Every Named War in Human History',
    description: `Explore ${STAT_CONFLICTS} wars and ${STAT_EMPIRES} empires across 5,000 years on an interactive world map.`,
    images: ['/og-image.png'],
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
        {/* Preconnect to Mapbox so the GL stylesheet + tile fetches start their
            DNS / TLS handshake during HTML parse instead of after CSSOM build. */}
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-ui">{children}</body>
    </html>
  )
}
