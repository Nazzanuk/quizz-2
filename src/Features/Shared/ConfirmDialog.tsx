'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { confirmDialogAtom } from '@/State/UiAtoms';
import { useHistoryDismiss } from './UseHistoryDismiss';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

const EXIT_DURATION_MS = 180;

export default function ConfirmDialog() {
  const [dialog, setDialog] = useAtom(confirmDialogAtom);
  const [closing, setClosing] = useState(false);
  const [value, setValue] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setDialog(null);
      setClosing(false);
      setValue('');
    }, EXIT_DURATION_MS);
  };

  const { requestDismiss, consumeEntry } = useHistoryDismiss(!!dialog, dismiss);

  if (!dialog) return null;

  const handleConfirm = () => {
    if (closing) return;
    // Pop the dialog's history entry before onConfirm so a navigation in the
    // callback doesn't leave a stale entry under the new page.
    const { onConfirm } = dialog;
    const trimmed = value.trim();
    consumeEntry(() => onConfirm(trimmed || undefined));
    dismiss();
  };

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={requestDismiss}
    >
      <div
        className={`${styles.panel} ${closing ? styles.panelClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={styles.title}>{dialog.title}</h3>
        <p className={styles.message}>{dialog.message}</p>
        {dialog.prompt && (
          <textarea
            className={styles.input}
            value={value}
            placeholder={dialog.prompt.placeholder}
            maxLength={dialog.prompt.maxLength ?? 500}
            aria-label={dialog.prompt.label ?? 'Details'}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
          />
        )}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={requestDismiss}>
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
