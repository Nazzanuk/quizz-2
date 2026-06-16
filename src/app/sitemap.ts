import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/Lib/SiteUrl';
import { runMigrations } from '@/Lib/Db/Migrate';
import { listPublicQuizzes } from '@/Lib/Db/Queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  let quizEntries: MetadataRoute.Sitemap = [];
  try {
    await runMigrations();
    const quizzes = await listPublicQuizzes(1000);
    quizEntries = quizzes.map((quiz) => ({
      url: `${base}/quiz/${quiz.id}`,
      lastModified: new Date(quiz.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch {
    // DB unavailable — still serve the static entries.
  }

  return [...staticEntries, ...quizEntries];
}
