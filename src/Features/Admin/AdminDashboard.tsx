'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ReportsPanel from './ReportsPanel';
import AnalyticsPanel from './AnalyticsPanel';
import UsersPanel from './UsersPanel';
import QuizzesPanel from './QuizzesPanel';
import MaintenancePanel from './MaintenancePanel';
import styles from './AdminView.module.css';

const TABS = [
  { key: 'reports', label: 'Reports' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'users', label: 'Users' },
  { key: 'quizzes', label: 'Quizzes' },
  { key: 'maintenance', label: 'Maintenance' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// Admin-only dashboard shell (server-gated by src/app/admin/layout.tsx; every
// API it calls re-checks admin too). Tabs switch panels via local state.
export default function AdminDashboard() {
  const params = useSearchParams();
  const requested = params.get('tab');
  const initial: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : 'reports';
  const [tab, setTab] = useState<TabKey>(initial);

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <p className={styles.kicker}>Admin</p>
        <h1 className={styles.heading}>Dashboard</h1>
        <nav className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'reports' && <ReportsPanel />}
        {tab === 'analytics' && <AnalyticsPanel />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'quizzes' && <QuizzesPanel />}
        {tab === 'maintenance' && <MaintenancePanel />}
      </div>
    </AppShell>
  );
}
