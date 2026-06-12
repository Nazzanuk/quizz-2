'use client';

import type { PlayerProfile } from '@/Lib/Types';
import styles from './CategoryBars.module.css';

interface CategoryBarsProps {
  profile: PlayerProfile;
}

export default function CategoryBars({ profile }: CategoryBarsProps) {
  const categories = Object.entries(profile.categories)
    .map(([name, stats]) => ({
      name,
      seen: stats.seen,
      pct: stats.seen > 0 ? Math.round((stats.correct / stats.seen) * 100) : 0,
    }))
    .sort((a, b) => b.seen - a.seen)
    .slice(0, 6);

  if (categories.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Category strengths</h2>
      </div>
      <div className={styles.list}>
        {categories.map((category) => (
          <div key={category.name} className={styles.row}>
            <div className={styles.rowTop}>
              <span>{category.name}</span>
              <strong>{category.pct}%</strong>
            </div>
            <div className={styles.track}>
              <span style={{ width: `${category.pct}%` }} />
            </div>
            <p>{category.seen} seen</p>
          </div>
        ))}
      </div>
    </section>
  );
}
