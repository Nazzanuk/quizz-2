'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import SignInButton from '@/Features/Shared/SignInButton';
import { signOut } from '@/Lib/Auth/Client';
import { useAccount } from '@/Lib/Hooks/UseAccount';
import styles from './AccountPanel.module.css';

// Account section in Settings: shows who's signed in, their credit balance, and
// a sign-out button. Anonymous users get a sign-in prompt instead.
export default function AccountPanel({ className }: { className?: string }) {
  const router = useRouter();
  const { account, loading, signedIn } = useAccount();
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
        </>
      )}
      <Button variant="secondary" fullWidth disabled={signingOut} onClick={handleSignOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </Card>
  );
}
