'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import SignInButton from '@/Features/Shared/SignInButton';
import { signOut } from '@/Lib/Auth/Client';
import { useAccount } from '@/Lib/Hooks/UseAccount';
import { ApiError, updateUsername } from '@/Lib/Api/Client';
import { USERNAME_MAX, validateUsername } from '@/Lib/Types';
import { addToastAtom } from '@/State/UiAtoms';
import { haptic } from '@/Features/Shared/Haptic';
import styles from './AccountPanel.module.css';

// Account section in Settings: shows who's signed in, their credit balance, the
// public username they use on leaderboards, and a sign-out button. Anonymous
// users get a sign-in prompt instead.
export default function AccountPanel({ className }: { className?: string }) {
  const router = useRouter();
  const { account, loading, signedIn, reload } = useAccount();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return (
      <Card color="bg" className={className}>
        <div className={`uiSkeleton ${styles.skeleton}`} />
      </Card>
    );
  }

  if (!signedIn) {
    return (
      <Card color="lavender" className={className}>
        <p className={styles.label}>Account</p>
        <p className={styles.hint}>
          Sign in with Google to create quizzes and keep them in your library.
        </p>
        <SignInButton callbackURL="/settings" fullWidth />
      </Card>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Card color="bg" className={className}>
      <p className={styles.label}>Account</p>
      {account && (
        <>
          <p className={styles.name}>{account.name}</p>
          <p className={styles.email}>{account.email}</p>
          <p className={styles.credits}>
            {account.credits} credit{account.credits === 1 ? '' : 's'} · refreshes monthly
          </p>
          <UsernameEditor
            key={account.username ?? 'unset'}
            currentUsername={account.username}
            onSaved={reload}
          />
        </>
      )}
      <Button variant="secondary" fullWidth disabled={signingOut} onClick={handleSignOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </Card>
  );
}

function UsernameEditor({
  currentUsername,
  onSaved,
}: {
  currentUsername: string | null;
  onSaved: () => void;
}) {
  const addToast = useSetAtom(addToastAtom);
  // Initial state derives from the saved username; the parent remounts this
  // component (via key) whenever the saved username changes, so no effect sync.
  const [editing, setEditing] = useState(currentUsername === null);
  const [value, setValue] = useState(currentUsername ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    const formatError = validateUsername(trimmed);
    if (formatError) {
      setError(formatError);
      return;
    }
    if (trimmed === currentUsername) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateUsername(trimmed);
      addToast({ message: 'Username saved', type: 'success' });
      haptic('tap');
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save username');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className={styles.usernameRow}>
        <div className={styles.usernameText}>
          <span className={styles.usernameLabel}>Username</span>
          <span className={styles.usernameValue}>@{currentUsername}</span>
        </div>
        <button type="button" className={styles.usernameEdit} onClick={() => setEditing(true)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={styles.usernameForm}>
      <label className={styles.usernameLabel} htmlFor="username-input">
        {currentUsername ? 'Change username' : 'Pick a username for leaderboards'}
      </label>
      <div className={styles.usernameInputRow}>
        <span className={styles.usernameAt} aria-hidden="true">@</span>
        <input
          id="username-input"
          className={styles.usernameInput}
          value={value}
          maxLength={USERNAME_MAX}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="quizwhiz"
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSave();
          }}
        />
      </div>
      {error && <p className={styles.usernameError}>{error}</p>}
      <div className={styles.usernameActions}>
        <Button variant="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {currentUsername && (
          <button
            type="button"
            className={styles.usernameCancel}
            onClick={() => {
              setValue(currentUsername);
              setError(null);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
