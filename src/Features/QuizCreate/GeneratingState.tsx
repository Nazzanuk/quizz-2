'use client';

import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import styles from './GeneratingState.module.css';

export default function GeneratingState() {
  return (
    <div className={styles.container}>
      <LoadingSpinner size={48} />
      <p className={styles.heading}>Generating your quiz</p>
      <p className={styles.body}>
        This usually takes a few seconds...
      </p>
    </div>
  );
}
