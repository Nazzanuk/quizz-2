'use client';

import { useState } from 'react';
import Button from './Button';
import { signInWithGoogle } from '@/Lib/Auth/Client';

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

  const handleClick = async () => {
    setPending(true);
    try {
      await signInWithGoogle(callbackURL);
    } catch {
      // The provider redirect didn't happen — let the user retry.
      setPending(false);
    }
  };

  return (
    <Button variant="primary" fullWidth={fullWidth} disabled={pending} onClick={handleClick}>
      {pending ? 'Connecting…' : label}
    </Button>
  );
}
