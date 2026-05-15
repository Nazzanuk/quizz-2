'use client';

import styles from './GeneratingState.module.css';

export default function GeneratingState() {
  return (
    <div className={styles.container}>
      <div className={styles.dots}>
        <span /><span /><span />
      </div>
      <p className={styles.heading}>Generating your quiz</p>
      <p className={styles.body}>This usually takes a few seconds...</p>
    </div>
  );
}
