'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/Lib/Auth/Client';
import { getPlayerProfile, clearAnonIdentity } from '@/Lib/PlayerProfile';
import { claimAnon } from '@/Lib/Api/Client';

// When a guest signs in, migrate their anonymous runs into the new account and
// adopt their guest name as the account username (if still free). Mounted once
// at the app root; runs at most once per guest id.
export default function AnonClaim() {
  const { data: session } = useSession();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!session?.user || ranRef.current) return;
    const profile = getPlayerProfile();
    // Nothing to claim if they never played as a guest on this device.
    if (!profile.anonId) return;

    ranRef.current = true;
    claimAnon(profile.anonId, profile.username ?? undefined)
      // Drop the guest identity so it can't be claimed twice or reused.
      .then(() => clearAnonIdentity())
      .catch(() => {
        // Let a later mount retry on transient failure.
        ranRef.current = false;
      });
  }, [session?.user]);

  return null;
}
