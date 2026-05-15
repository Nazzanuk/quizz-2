'use client';

import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: number;
}

export default function LoadingSpinner({ size = 32 }: LoadingSpinnerProps) {
  return (
    <div
      className={styles.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
