'use client';

import { useEffect, useState } from 'react';
import { ApiError, fetchAnalytics } from '@/Lib/Api/Client';
import type { AnalyticsSummary } from '@/Lib/Types';
import Card from '@/Features/Shared/Card';
import styles from './AnalyticsView.module.css';

const TYPE_LABELS: Record<string, string> = {
  sign_in: 'Sign-ins',
  quiz_created: 'Quizzes created',
  run_completed: 'Runs played',
  quiz_viewed: 'Quiz views',
  quiz_shared: 'Shares',
};
const TYPE_ORDER = ['quiz_created', 'run_completed', 'quiz_viewed', 'quiz_shared', 'sign_in'];

export default function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetchAnalytics()
      .then((summary) => {
        setData(summary);
        setForbidden(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setForbidden(true);
        setData({ totals: {}, daily: [], topViewed: [], topPlayed: [] });
      });
  }, []);

  if (forbidden) {
    return (
      <Card color="lavender" className={styles.state}>
        <p>You don&apos;t have access to analytics.</p>
      </Card>
    );
  }
  if (data === null) {
    return <Card color="bg" className={styles.state}><p>Loading…</p></Card>;
  }

  const maxDaily = Math.max(1, ...data.daily.map((d) => d.total));

  return (
    <>
      <div className={styles.tiles}>
        {TYPE_ORDER.map((type) => (
          <div key={type} className={styles.tile}>
            <span className={styles.tileNum}>{data.totals[type] ?? 0}</span>
            <span className={styles.tileLabel}>{TYPE_LABELS[type] ?? type}</span>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Events · last 14 days</h2>
        <div className={styles.chart}>
          {data.daily.map((day) => (
            <div key={day.date} className={styles.barCol} title={`${day.date}: ${day.total}`}>
              <div className={styles.barTrack}>
                <div
                  className={styles.bar}
                  style={{ height: `${Math.round((day.total / maxDaily) * 100)}%` }}
                />
              </div>
              <span className={styles.barLabel}>{day.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.lists}>
        <TopList title="Most viewed" rows={data.topViewed} unit="views" />
        <TopList title="Most played" rows={data.topPlayed} unit="plays" />
      </div>
    </>
  );
}

function TopList({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: { quizId: string; title: string; count: number }[];
  unit: string;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {rows.length === 0 ? (
        <Card color="bg" className={styles.state}><p>No data yet.</p></Card>
      ) : (
        <ol className={styles.topList}>
          {rows.map((row, i) => (
            <li key={row.quizId} className={styles.topRow}>
              <span className={styles.topRank}>{i + 1}</span>
              <a href={`/quiz/${row.quizId}`} className={styles.topTitle}>{row.title}</a>
              <span className={styles.topCount}>{row.count} {unit}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
