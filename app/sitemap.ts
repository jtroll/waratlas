import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

interface Conflict {
  id: string;
  importance: number;
}

/**
 * Sitemap for SEO discoverability — Google can crawl every conflict permalink.
 * Prioritizes high-importance conflicts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wars-atlas.example';
  let conflicts: Conflict[] = [];
  try {
    const p = path.join(process.cwd(), 'public', 'conflicts.json');
    conflicts = JSON.parse(fs.readFileSync(p, 'utf8')) as Conflict[];
  } catch {
    // OK to fall back to empty list
  }

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
