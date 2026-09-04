import { MetadataRoute } from 'next';
import { getConflictIndex, getEmpireIndex } from '@/lib/server/conflict-index';
import { getSiteUrl } from '@/lib/site-url';

/**
 * Sitemap for SEO discoverability — every conflict permalink (/c/<id>) and
 * every empire permalink (/e/<id>), plus the prose pages. Prioritizes
 * high-importance conflicts. Reads the module-level cached indexes
 * (parsed once per process, shared with /c/[id] and /e/[id]).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const { list: conflicts } = getConflictIndex();
  const { list: empires } = getEmpireIndex();

  const today = new Date();

  const conflictUrls = conflicts.map((c) => ({
    url: `${baseUrl}/c/${c.id}`,
    lastModified: today,
    changeFrequency: 'monthly' as const,
    priority: c.importance >= 4 ? 0.9 : c.importance >= 3 ? 0.7 : 0.5,
  }));

  const empireUrls = empires.map((e) => ({
    url: `${baseUrl}/e/${e.id}`,
    lastModified: today,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sources`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...conflictUrls,
    ...empireUrls,
  ];
}
