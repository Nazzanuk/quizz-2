'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/Lib/Auth/Client';
import { fetchAccount } from '@/Lib/Api/Client';
import type { AccountResponse } from '@/Lib/Types';

interface UseAccountResult {
  account: AccountResponse | null;
  // True until the session state is known (avoids auth UI flicker).
  loading: boolean;
  signedIn: boolean;
  reload: () => void;
}

// Combines the Better Auth session with a fresh credit balance from /api/account
// (which also applies the lazy monthly refresh).
export function useAccount(): UseAccountResult {
  const { data: session, isPending } = useSession();
  const signedIn = Boolean(session?.user);
  const [fetched, setFetched] = useState<AccountResponse | null>(null);

  const reload = useCallback(() => {
    if (!session?.user) return;
    fetchAccount()
      .then(setFetched)
      .catch(() => setFetched(null));
  }, [session?.user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    // Derive null when signed out so we never carry a stale account.
    account: signedIn ? fetched : null,
    loading: isPending,
    signedIn,
    reload,
  };
}
