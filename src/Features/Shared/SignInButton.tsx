'use client';

import { useState } from 'react';
import Button from './Button';
import { signInWithGoogle } from '@/Lib/Auth/Client';
import styles from './SignInButton.module.css';

interface SignInButtonProps {
  callbackURL?: string;
  label?: string;
  fullWidth?: boolean;
}

// Kicks off Google OAuth. Used wherever a Creator action needs a real account.
export default function SignInButton({
  callbackURL = '/',
  label = 'Sign in with Google',
  fullWidth = false,
}: SignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setError('');
    setPending(true);
    try {
      // On success the browser redirects to Google (this promise won't resolve
      // because the page unloads). If it resolves with an error instead, the
      // redirect never happened — surface it rather than silently doing nothing.
      const res = await signInWithGoogle(callbackURL);
      const resErr = (res as { error?: { message?: string } } | undefined)?.error;
      if (resErr) {
        setError(resErr.message ?? 'Could not start sign-in. Please try again.');
        setPending(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in. Please try again.');
      setPending(false);
    }
  };

  return (
    <>
      <Button variant="primary" fullWidth={fullWidth} disabled={pending} onClick={handleClick}>
        {pending ? 'Connecting…' : label}
      </Button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </>
  );
}
