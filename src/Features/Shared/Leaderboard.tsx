'use client';

import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/Lib/Api/Client';
import { useSession } from '@/Lib/Auth/Client';
import { getPlayerProfile } from '@/Lib/PlayerProfile';
import type { QuizLeaderboard } from '@/Lib/Types';
import styles from './Leaderboard.module.css';

interface LeaderboardProps {
  quizId: string;
  // Compact mode (results screen) trims meta and shows fewer rows.
  compact?: boolean;
  limit?: number;
}

export default function Leaderboard({ quizId, compact = false, limit }: LeaderboardProps) {
  const { data: session } = useSession();
  const signedInId = session?.user?.id ?? null;
  const rowLimit = limit ?? (compact ? 5 : 10);
  // Signed-out viewers are highlighted via their local guest id (only if they
  // already have one — i.e. they've played). Resolved after mount to avoid a
  // hydration mismatch.
  const [anonId, setAnonId] = useState<string | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setAnonId(signedInId ? null : (getPlayerProfile().anonId || null));
    });
    return () => cancelAnimationFrame(id);
  }, [signedInId]);
  const viewerId = signedInId ?? anonId;

  // Key the fetched result by quizId so a quiz change reads as "loading"
  // without a synchronous setState reset inside the effect.
  const [fetched, setFetched] = useState<{ quizId: string; board: QuizLeaderboard | null } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(quizId, rowLimit, anonId ?? undefined)
      .then((data) => {
        if (!cancelled) setFetched({ quizId, board: data });
      })
      .catch(() => {
        if (!cancelled) setFetched({ quizId, board: null });
      });
    return () => {
      cancelled = true;
    };
  }, [quizId, rowLimit, anonId]);

  const loaded = fetched?.quizId === quizId;
  const board = loaded ? fetched.board : null;

  if (!loaded) {
    return (
      <section className={`${styles.section} ${compact ? styles.compact : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Leaderboard</h2>
        </div>
        <div className={`uiSkeleton ${styles.skeleton}`} aria-hidden="true" />
      </section>
    );
  }

  if (!board) return null;

  const { averagePct, totalPlays, entries, yourRank } = board;
  // A run that hasn't been played at all → nothing useful to show.
  if (totalPlays === 0) {
    if (compact) return null;
    return (
      <section className={`${styles.section} ${styles.compact}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Leaderboard</h2>
        </div>
        <p className={styles.empty}>No plays yet. Be the first to set a score.</p>
      </section>
    );
  }

  const viewerOnBoard = viewerId != null && entries.some((entry) => entry.userId === viewerId);

  return (
    <section className={`${styles.section} ${compact ? styles.compact : ''}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Leaderboard</h2>
        {averagePct !== null && (
          <span className={styles.average}>
            Avg <strong>{averagePct}%</strong> · {totalPlays} {totalPlays === 1 ? 'play' : 'plays'}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>
          No ranked players yet. Play and add a name to claim #1.
        </p>
      ) : (
        <ol className={styles.list}>
          {entries.map((entry, index) => {
            const rank = index + 1;
            const isYou = entry.userId === viewerId;
            return (
              <li
                key={entry.userId}
                className={`${styles.row} ${isYou ? styles.you : ''}`}
              >
                <span className={`${styles.rank} ${rank <= 3 ? styles[`rank${rank}`] : ''}`}>
                  {rank}
                </span>
                <span className={styles.name}>
                  {entry.name}
                  {isYou && <span className={styles.youTag}>You</span>}
                </span>
                {!compact && (
                  <span className={styles.meta}>
                    {entry.plays} {entry.plays === 1 ? 'play' : 'plays'}
                    {entry.bestStreak > 0 && ` · ${entry.bestStreak} streak`}
                  </span>
                )}
                <span className={styles.score}>{entry.bestPct}%</span>
              </li>
            );
          })}
        </ol>
      )}

      {/* When the viewer ranks outside the shown rows, surface their standing. */}
      {yourRank !== null && !viewerOnBoard && (
        <p className={styles.yourRank}>
          Your first attempt ranks <strong>#{yourRank}</strong>.
        </p>
      )}

      {!compact && entries.length > 0 && (
        <p className={styles.note}>Ranked by each player&apos;s first attempt.</p>
      )}
    </section>
  );
}
