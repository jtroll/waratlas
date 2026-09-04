import { MetadataRoute } from 'next';
import { getConflictIndex } from '@/lib/server/conflict-index';
import { getSiteUrl } from '@/lib/site-url';

/**
 * Sitemap for SEO discoverability — Google can crawl every conflict permalink.
 * Prioritizes high-importance conflicts. Reads the module-level cached
 * conflict index (parsed once per process, shared with /c/[id]).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const { list: conflicts } = getConflictIndex();

  const today = new Date();

  const conflictUrls = conflicts.map((c) => ({
    url: `${baseUrl}/c/${c.id}`,
    lastModified: today,
    changeFrequency: 'monthly' as const,
    priority: c.importance >= 4 ? 0.9 : c.importance >= 3 ? 0.7 : 0.5,
  }));

  return [
    {
      url: baseUrl,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    ...conflictUrls,
  ];
}
