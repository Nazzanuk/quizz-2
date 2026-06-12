'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchStats } from '@/Lib/Api/Client';
import { getPlayerProfile } from '@/Lib/PlayerProfile';
import type { PlayerProfile, StatsResponse } from '@/Lib/Types';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import EmptyState from '@/Features/Home/EmptyState';
import CategoryBars from './CategoryBars';
import RunHistory from './RunHistory';
import StatTiles from './StatTiles';
import styles from './ProgressView.module.css';

export default function ProgressView() {
  const [profile] = useState<PlayerProfile>(() => getPlayerProfile());
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchStats(12)
      .then(setStats)
      .catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const apiTotals = stats?.totals;
    return {
      runs: Math.max(profile.totalRuns, apiTotals?.runs ?? 0),
      questions: Math.max(profile.totalQuestions, apiTotals?.questions ?? 0),
      correct: Math.max(profile.totalCorrect, apiTotals?.correct ?? 0),
      bestPct: maxNullable(profile.bestPct, apiTotals?.bestPct ?? null),
      averagePct: apiTotals?.averagePct
        ?? (profile.totalQuestions > 0
          ? Math.round((profile.totalCorrect / profile.totalQuestions) * 100)
          : null),
      bestStreak: Math.max(profile.bestStreak, apiTotals?.bestStreak ?? 0),
      fastestMs: minNullable(profile.fastestMs, apiTotals?.fastestMs ?? null),
    };
  }, [profile, stats]);

  const empty = totals.runs === 0 && (stats?.runs.length ?? 0) === 0;

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <span className="neo-bigtext" aria-hidden="true">Stats</span>
        <span className="neo-sticker" aria-hidden="true">Progress</span>
        <p className={styles.kicker}>Run receipts</p>
        <h1 className={styles.heading}>Progress</h1>
        {empty ? (
          <EmptyState />
        ) : (
          <>
            <StatTiles totals={totals} />
            <CategoryBars profile={profile} />
            <RunHistory runs={stats?.runs ?? []} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function minNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}
