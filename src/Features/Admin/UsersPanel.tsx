'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSetAtom } from 'jotai';
import {
  ApiError,
  deleteAdminUser,
  fetchAdminUsers,
  setUserCredits,
} from '@/Lib/Api/Client';
import { useAccount } from '@/Lib/Hooks/UseAccount';
import type { AdminUserRow } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import { addToastAtom, confirmDialogAtom } from '@/State/UiAtoms';
import Card from '@/Features/Shared/Card';
import Button from '@/Features/Shared/Button';
import styles from './AdminPanels.module.css';

export default function UsersPanel() {
  const { account } = useAccount();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const addToast = useSetAtom(addToastAtom);
  const setConfirm = useSetAtom(confirmDialogAtom);

  const load = useCallback(() => {
    fetchAdminUsers()
      .then((data) => {
        setUsers(data);
        setForbidden(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setForbidden(true);
        setUsers([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchRow = (id: string, credits: number) =>
    setUsers((prev) => prev?.map((u) => (u.id === id ? { ...u, credits } : u)) ?? prev);

  const saveCredits = async (user: AdminUserRow, credits: number) => {
    try {
      const res = await setUserCredits(user.id, credits);
      patchRow(user.id, res.credits);
      addToast({ message: `${user.email}: ${res.credits} credits`, type: 'success' });
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : 'Update failed', type: 'error' });
    }
  };

  const confirmDelete = (user: AdminUserRow) => {
    setConfirm({
      title: 'Delete user',
      message: `Permanently delete ${user.email} — their account, quizzes, and gameplay history. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteAdminUser(user.id);
          setUsers((prev) => prev?.filter((u) => u.id !== user.id) ?? prev);
          addToast({ message: `Deleted ${user.email}`, type: 'success' });
        } catch {
          addToast({ message: "Couldn't delete that user", type: 'error' });
        }
      },
    });
  };

  if (forbidden) {
    return <Card color="lavender" className={styles.state}><p>You don&apos;t have access.</p></Card>;
  }
  if (users === null) {
    return <Card color="bg" className={styles.state}><p>Loading users…</p></Card>;
  }
  if (users.length === 0) {
    return <Card color="sage" className={styles.state}><p>No users yet.</p></Card>;
  }

  return (
    <div className={styles.panel}>
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          isSelf={account?.id === user.id}
          onSave={saveCredits}
          onDelete={confirmDelete}
        />
      ))}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onSave,
  onDelete,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onSave: (user: AdminUserRow, credits: number) => Promise<void>;
  onDelete: (user: AdminUserRow) => void;
}) {
  const [value, setValue] = useState(String(user.credits));
  const [saving, setSaving] = useState(false);

  const dirty = value.trim() !== String(user.credits);

  const save = async () => {
    const credits = Math.floor(Number(value));
    if (!Number.isFinite(credits) || credits < 0 || credits > 9999) return;
    setSaving(true);
    await onSave(user, credits);
    setSaving(false);
  };

  return (
    <Card color="bg" className={styles.card}>
      <div className={styles.rowTop}>
        <span className={styles.name}>{user.name}</span>
        {user.username && <span className={styles.badge}>@{user.username}</span>}
      </div>
      <p className={styles.sub}>{user.email} · joined {formatDate(user.createdAt)}</p>
      <div className={styles.badges}>
        <span className={styles.badge}>{user.quizCount} quizzes</span>
        <span className={styles.badge}>{user.runCount} runs</span>
      </div>
      <div className={styles.actions}>
        <input
          className={styles.input}
          type="number"
          min={0}
          max={9999}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Credits for ${user.email}`}
        />
        <Button variant="secondary" disabled={!dirty || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save credits'}
        </Button>
        {!isSelf && (
          <button type="button" className={styles.danger} onClick={() => onDelete(user)}>
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}
