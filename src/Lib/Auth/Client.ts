'use client';

import { createAuthClient } from 'better-auth/react';

// Browser-side auth client. Talks to /api/auth/* via fetch. The credits +
// creditsRefreshedAt additional fields are inferred onto the session user.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;

// Kick off Google OAuth. callbackURL is where the provider redirects back to.
export function signInWithGoogle(callbackURL = '/'): Promise<unknown> {
  return signIn.social({ provider: 'google', callbackURL });
}
