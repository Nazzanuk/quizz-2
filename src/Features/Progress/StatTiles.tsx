'use client';

import type { StatsTotals } from '@/Lib/Types';
import { useCountUp } from '@/Features/Shared/useCountUp';
import styles from './StatTiles.module.css';

interface StatTilesProps {
  totals: StatsTotals;
}

export default function StatTiles({ totals }: StatTilesProps) {
  const runs = useCountUp(totals.runs, 700);
  const accuracy = useCountUp(totals.averagePct ?? 0, 800);
  const best = useCountUp(totals.bestPct ?? 0, 850);
  const streak = useCountUp(totals.bestStreak, 750);

  return (
    <section className={styles.grid} aria-label="Progress summary">
      <StatTile label="Runs" value={runs.toString()} tone="yellow" />
      <StatTile label="Avg accuracy" value={`${accuracy}%`} tone="cyan" />
      <StatTile label="Best" value={`${best}%`} tone="lime" />
      <StatTile label="Best streak" value={streak.toString()} tone="violet" />
      <StatTile label="Questions" value={totals.questions.toString()} tone="white" />
      <StatTile label="Fastest" value={totals.fastestMs ? formatMs(totals.fastestMs) : '-'} tone="red" />
    </section>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'yellow' | 'cyan' | 'lime' | 'violet' | 'white' | 'red';
}) {
  return (
    <div className={`${styles.tile} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMs(value: number): string {
  return `${(value / 1000).toFixed(1)}s`;
}
