import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/Lib/SiteUrl';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private/admin surfaces and the API shouldn't be crawled.
      disallow: ['/admin', '/api/', '/settings'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
