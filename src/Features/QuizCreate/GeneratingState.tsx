'use client';

import styles from './GeneratingState.module.css';

export default function GeneratingState() {
  return (
    <div className={styles.container}>
      <div className={styles.orb} aria-hidden="true">
        <span className={`${styles.ring} ${styles.ringOne}`} />
        <span className={`${styles.ring} ${styles.ringTwo}`} />
        <span className={styles.core} />
      </div>
      <p className={styles.kicker}>Cooking up your round</p>
      <div className={styles.dots}>
        <span /><span /><span />
      </div>
      <p className={styles.heading}>Generating your quiz</p>
      <p className={styles.body}>Picking formats, mixing difficulty, and getting the next run ready.</p>
    </div>
  );
}
