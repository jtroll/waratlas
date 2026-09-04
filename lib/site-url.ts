/**
 * Canonical site origin for metadata, sitemap and robots. Resolution order:
 * NEXT_PUBLIC_BASE_URL (explicit) → VERCEL_URL (preview deploys) → localhost.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
