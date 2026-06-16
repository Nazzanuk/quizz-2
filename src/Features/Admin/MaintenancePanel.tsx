'use client';

import { useState } from 'react';
import { useSetAtom } from 'jotai';
import {
  applyDedupe,
  backfillOwners,
  previewDedupe,
  resetAllCredits,
} from '@/Lib/Api/Client';
import type { DedupeBurst } from '@/Lib/Types';
import { addToastAtom, confirmDialogAtom } from '@/State/UiAtoms';
import Card from '@/Features/Shared/Card';
import Button from '@/Features/Shared/Button';
import styles from './AdminPanels.module.css';

export default function MaintenancePanel() {
  const addToast = useSetAtom(addToastAtom);
  const setConfirm = useSetAtom(confirmDialogAtom);

  const [windowMin, setWindowMin] = useState('30');
  const [preview, setPreview] = useState<{ bursts: DedupeBurst[]; totalToDelete: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const win = () => {
    const n = Math.floor(Number(windowMin));
    return Number.isFinite(n) && n > 0 ? n : 30;
  };

  const runPreview = async () => {
    setBusy('preview');
    try {
      setPreview(await previewDedupe(win()));
    } catch {
      addToast({ message: "Couldn't run preview", type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const confirmApplyDedupe = () => {
    if (!preview || preview.totalToDelete === 0) return;
    setConfirm({
      title: 'Delete duplicates',
      message: `Permanently delete ${preview.totalToDelete} duplicate quiz(zes), keeping the earliest of each group. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setBusy('apply');
        try {
          const { deleted } = await applyDedupe(win());
          addToast({ message: `Deleted ${deleted} duplicate(s)`, type: 'success' });
          setPreview(null);
        } catch {
          addToast({ message: "Couldn't delete duplicates", type: 'error' });
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const confirmResetCredits = () => {
    setConfirm({
      title: 'Reset all credits',
      message: 'Set EVERY user to the default credit allowance. This overwrites higher balances and cannot be undone.',
      confirmLabel: 'Reset all',
      onConfirm: async () => {
        setBusy('credits');
        try {
          const { users } = await resetAllCredits();
          addToast({ message: `Reset ${users} user(s)`, type: 'success' });
        } catch {
          addToast({ message: "Couldn't reset credits", type: 'error' });
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const confirmBackfill = () => {
    setConfirm({
      title: 'Backfill owners',
      message: 'Assign every ownerless legacy quiz to your account (as unlisted). Idempotent.',
      confirmLabel: 'Backfill',
      onConfirm: async () => {
        setBusy('backfill');
        try {
          const { assigned } = await backfillOwners();
          addToast({ message: `Assigned ${assigned} quiz(zes)`, type: 'success' });
        } catch {
          addToast({ message: "Couldn't backfill owners", type: 'error' });
        } finally {
          setBusy(null);
        }
      },
    });
  };

  return (
    <div className={styles.panel}>
      <Card color="bg" className={styles.card}>
        <p className={styles.maintTitle}>Dedupe duplicate quizzes</p>
        <p className={styles.maintHint}>
          Finds quizzes created in a burst with the same owner and topic (failed-generation retries),
          keeping the earliest of each. Preview first, then apply.
        </p>
        <div className={styles.actions}>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={windowMin}
            onChange={(e) => setWindowMin(e.target.value)}
            aria-label="Burst window in minutes"
          />
          <span className={styles.sub}>min window</span>
          <Button variant="secondary" disabled={busy !== null} onClick={runPreview}>
            {busy === 'preview' ? 'Checking…' : 'Preview'}
          </Button>
        </div>
        {preview && (
          <>
            {preview.bursts.map((burst) => (
              <div key={burst.keep.id} className={styles.burst}>
                <div className={styles.keep}>KEEP &quot;{burst.keep.title}&quot; ({burst.topic})</div>
                {burst.remove.map((r) => (
                  <div key={r.id} className={styles.remove}>DELETE &quot;{r.title}&quot;</div>
                ))}
              </div>
            ))}
            {preview.totalToDelete === 0 ? (
              <p className={styles.sub}>No duplicates found.</p>
            ) : (
              <Button variant="primary" disabled={busy !== null} onClick={confirmApplyDedupe}>
                {busy === 'apply' ? 'Deleting…' : `Apply — delete ${preview.totalToDelete}`}
              </Button>
            )}
          </>
        )}
      </Card>

      <Card color="bg" className={styles.card}>
        <p className={styles.maintTitle}>Reset all credits</p>
        <p className={styles.maintHint}>
          Sets every user to the default credit allowance and stamps the refresh time. Overwrites higher balances.
        </p>
        <Button variant="secondary" disabled={busy !== null} onClick={confirmResetCredits}>
          {busy === 'credits' ? 'Resetting…' : 'Reset all credits'}
        </Button>
      </Card>

      <Card color="bg" className={styles.card}>
        <p className={styles.maintTitle}>Backfill quiz owners</p>
        <p className={styles.maintHint}>
          Assigns ownerless legacy quizzes (created before accounts existed) to you as unlisted. Safe to re-run.
        </p>
        <Button variant="secondary" disabled={busy !== null} onClick={confirmBackfill}>
          {busy === 'backfill' ? 'Working…' : 'Backfill owners'}
        </Button>
      </Card>
    </div>
  );
}
