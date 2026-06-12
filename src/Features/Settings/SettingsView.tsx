'use client';

import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import SettingsControls from '@/Features/Shared/SettingsControls';
import styles from './SettingsView.module.css';

export default function SettingsView() {
  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <span className="neo-bigtext" aria-hidden="true">Tune</span>
        <span className="neo-sticker" aria-hidden="true">Controls</span>
        <p className={styles.kicker}>App preferences</p>
        <h1 className={styles.heading}>
          Settings
        </h1>
        <p className={styles.subhead}>
          Tune sound, haptics, host behavior, and play focus without leaving the main navigation.
        </p>
        <SettingsControls className={styles.controls} />
      </div>
    </AppShell>
  );
}
