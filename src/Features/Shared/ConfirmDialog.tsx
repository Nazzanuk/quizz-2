'use client';

import { useAtom } from 'jotai';
import { confirmDialogAtom } from '@/State/UiAtoms';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog() {
  const [dialog, setDialog] = useAtom(confirmDialogAtom);

  if (!dialog) return null;

  const handleConfirm = () => {
    dialog.onConfirm();
    setDialog(null);
  };

  return (
    <div className={styles.overlay} onClick={() => setDialog(null)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{dialog.title}</h3>
        <p className={styles.message}>{dialog.message}</p>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            {dialog.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}
