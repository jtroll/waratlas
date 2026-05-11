/** @type {import('next').NextConfig} */

// Long-cache for static assets that only change on deploy. Stale-while-revalidate
// keeps the next visit fast even when the dataset changes.
const LONG_CACHE = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800';
// Mid cache for OG images and favicon — change rarely.
const MID_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800';
// Short edge cache for robots / sitemap.
const SHORT_CACHE = 'public, max-age=3600, s-maxage=86400';

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
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
    const midCacheFiles = ['/og-image.png', '/og-image.svg', '/favicon.svg'];
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

module.exports = nextConfig;
