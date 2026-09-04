import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
