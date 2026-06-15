'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  fetchReportedQuizzes,
  setQuizStatus,
} from '@/Lib/Api/Client';
import type { ReportedQuiz } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Card from '@/Features/Shared/Card';
import Button from '@/Features/Shared/Button';
import styles from './AdminView.module.css';

// Lightweight moderation console (admins only, gated server-side by ADMIN_EMAILS).
export default function AdminView() {
  const [reports, setReports] = useState<ReportedQuiz[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchReportedQuizzes()
      .then((data) => {
        setReports(data);
        setForbidden(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setForbidden(true);
        }
        setReports([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBlock = async (report: ReportedQuiz) => {
    setBusy(report.quizId);
    const next = report.status === 'blocked' ? 'active' : 'blocked';
    try {
      await setQuizStatus(report.quizId, next);
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <p className={styles.kicker}>Moderation</p>
        <h1 className={styles.heading}>Reports</h1>

        {forbidden ? (
          <Card color="lavender" className={styles.state}>
            <p>You don&apos;t have access to moderation tools.</p>
          </Card>
        ) : reports === null ? (
          <Card color="bg" className={styles.state}><p>Loading reports…</p></Card>
        ) : reports.length === 0 ? (
          <Card color="sage" className={styles.state}><p>No reported quizzes. All clear.</p></Card>
        ) : (
          <div className={styles.list}>
            {reports.map((report) => (
              <Card
                key={report.quizId}
                color={report.status === 'blocked' ? 'lavender' : 'bg'}
                className={styles.card}
              >
                <div className={styles.cardTop}>
                  <a href={`/quiz/${report.quizId}`} className={styles.title}>{report.title}</a>
                  <span className={`${styles.badge} ${report.status === 'blocked' ? styles.blocked : ''}`}>
                    {report.status === 'blocked' ? 'Blocked' : report.visibility}
                  </span>
                </div>
                <p className={styles.meta}>
                  {report.reportCount} report{report.reportCount === 1 ? '' : 's'} · last {formatDate(report.lastReportedAt)}
                </p>
                {report.reasons.length > 0 && (
                  <ul className={styles.reasons}>
                    {report.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                  </ul>
                )}
                <Button
                  variant={report.status === 'blocked' ? 'secondary' : 'primary'}
                  disabled={busy === report.quizId}
                  onClick={() => toggleBlock(report)}
                >
                  {busy === report.quizId
                    ? 'Saving…'
                    : report.status === 'blocked' ? 'Unblock' : 'Block'}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
