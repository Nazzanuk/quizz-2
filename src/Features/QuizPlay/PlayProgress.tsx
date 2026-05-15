'use client';

import styles from './PlayProgress.module.css';

interface PlayProgressProps {
  current: number;
  total: number;
}

export default function PlayProgress({ current, total }: PlayProgressProps) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0;

  return (
    <div className={styles.container}>
      <p className={styles.label}>
        {current + 1} of {total}
      </p>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
