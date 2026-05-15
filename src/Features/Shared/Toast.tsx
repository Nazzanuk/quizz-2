'use client';

import { useAtomValue } from 'jotai';
import { toastQueueAtom } from '@/State/UiAtoms';
import styles from './Toast.module.css';

export default function Toast() {
  const toasts = useAtomValue(toastQueueAtom);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
