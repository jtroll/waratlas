/** @type {import('next').NextConfig} */

// Long-cache for static assets that only change on deploy. Stale-while-revalidate
// keeps the next visit fast even when the dataset changes.
const LONG_CACHE = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800';
// Mid cache for OG images and favicon — change rarely.
const MID_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800';
// Short edge cache for robots / sitemap.
const SHORT_CACHE = 'public, max-age=3600, s-maxage=86400';

// Content-Security-Policy.
//
// Shipped in Report-Only mode initially: violations are logged in the browser
// console + reporting endpoint (if configured) but resources are NOT blocked.
// This lets us watch for misses for a week or two before flipping to enforcing.
//
// To promote to enforcing once happy: change the header KEY from
// 'Content-Security-Policy-Report-Only' to 'Content-Security-Policy' below.
//
// Allowlist rationale, in order:
//   - default-src 'self'      : everything not listed below defaults to same-origin
//   - script-src 'unsafe-eval': mapbox-gl-js v3 compiles WebGL shaders at runtime
//   - script-src 'unsafe-inline': Next.js App Router emits inline hydration scripts.
//                                 Nonces would be tighter but require middleware.
//   - style-src api.mapbox.com: we link mapbox-gl.css from the Mapbox CDN
//   - style-src 'unsafe-inline': mapbox-gl + next/font both emit inline styles
//   - connect-src mapbox/tiles : tile fetches, telemetry, glyph + sprite URLs
//   - img-src mapbox + data:   : raster tiles, embedded SVG data URIs
//   - worker-src blob:         : mapbox-gl spawns workers from blob: URLs
//   - frame-ancestors 'self'   : prevent clickjacking (redundant w/ X-Frame-Options
//                                 but covers browsers that ignore the legacy header)
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
  "img-src 'self' data: blob: https://api.mapbox.com https://*.tiles.mapbox.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // HSTS — tell browsers to never speak plain HTTP to this origin again.
  // 1-year max-age, includeSubDomains. No `preload` (the preload list is a
  // one-way commitment; opt in via hstspreload.org once stable).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // CSP in Report-Only mode. Promote the key to 'Content-Security-Policy'
  // after monitoring DevTools console for violation reports.
  { key: 'Content-Security-Policy-Report-Only', value: CSP_DIRECTIVES },
];

const nextConfig = {
  reactStrictMode: true,
  compress: true,

  async headers() {
    const longCacheFiles = [
      '/empires.json',
      '/conflicts.json',
      '/cities.json',
      '/empire-wikipedia.json',
    ];
    const midCacheFiles = ['/og-card.png', '/og-image.png', '/og-image.svg', '/favicon.svg'];
    const shortCacheFiles = ['/sitemap.xml'];

    return [
      ...longCacheFiles.map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: LONG_CACHE },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      })),
      ...midCacheFiles.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: MID_CACHE }],
      })),
      ...shortCacheFiles.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: SHORT_CACHE }],
      })),
      // Service worker must NOT be cached — otherwise a deploy can leave
      // visitors stuck on a stale SW that keeps serving old data forever.
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Defense-in-depth security headers for all responses.
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

// Bundle analyzer is opt-in via ANALYZE=true. Run `npm run analyze` to get
// the treemap report (output under .next/analyze/). Useful for keeping an
// eye on mapbox-gl + the conflict/empire data payloads.
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
