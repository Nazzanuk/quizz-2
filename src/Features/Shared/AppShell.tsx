'use client';

import { usePathname } from 'next/navigation';
import { useSetAtom } from 'jotai';
import type { ReactNode } from 'react';
import { settingsOpenAtom } from '@/State/SettingsAtoms';
import { useTransitionRouter } from './Navigate';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { back } = useTransitionRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const setSettingsOpen = useSetAtom(settingsOpenAtom);

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        {!isHome ? (
          <button
            className={styles.iconButton}
            onClick={back}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
        ) : (
          <span />
        )}
        <button
          className={styles.iconButton}
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.62.06-.94 0-.32-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.04-.7-1.62-.94l-.36-2.54A.484.484 0 0 0 13.92 2h-3.84a.484.484 0 0 0-.49.41l-.36 2.54c-.58.24-1.12.56-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.71 8.47a.49.49 0 0 0 .12.61L4.86 10.66c-.04.31-.06.62-.06.94 0 .32.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.13.22.4.31.59.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.05.24.25.41.49.41h3.84c.24 0 .45-.17.49-.41l.36-2.54c.58-.24 1.12-.56 1.62-.94l2.39.96c.22.09.49 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61L19.14 12.94zM12 15.6A3.6 3.6 0 0 1 8.4 12c0-1.99 1.61-3.6 3.6-3.6s3.6 1.61 3.6 3.6-1.61 3.6-3.6 3.6z" />
          </svg>
        </button>
      </div>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
