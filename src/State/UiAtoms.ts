import { atom } from 'jotai';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export const toastQueueAtom = atom<ToastItem[]>([]);
export const confirmDialogAtom = atom<ConfirmDialogState | null>(null);

export const addToastAtom = atom(
  null,
  (get, set, toast: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    const current = get(toastQueueAtom);
    set(toastQueueAtom, [...current, { ...toast, id }]);

    setTimeout(() => {
      set(toastQueueAtom, (prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  },
);
