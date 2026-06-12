'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => unknown;
};

// Counts in-app pushes this page load, so exits can tell "there is an in-app
// page behind us" (use back()) from a cold deep link (use replace()).
let inAppPushCount = 0;

export function hasInAppHistory(): boolean {
  return inAppPushCount > 0;
}

export function useTransitionRouter() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
      inAppPushCount += 1;
      if (typeof document !== 'undefined') {
        const doc = document as ViewTransitionDocument;
        if (doc.startViewTransition) {
          doc.startViewTransition(() => router.push(href));
          return;
        }
      }
      router.push(href);
    },
    [router],
  );

  const replace = useCallback(
    (href: string) => {
      if (typeof document !== 'undefined') {
        const doc = document as ViewTransitionDocument;
        if (doc.startViewTransition) {
          doc.startViewTransition(() => router.replace(href));
          return;
        }
      }
      router.replace(href);
    },
    [router],
  );

  const back = useCallback(() => {
    inAppPushCount = Math.max(0, inAppPushCount - 1);
    if (typeof document !== 'undefined') {
      const doc = document as ViewTransitionDocument;
      if (doc.startViewTransition) {
        doc.startViewTransition(() => router.back());
        return;
      }
    }
    router.back();
  }, [router]);

  return { navigate, replace, back };
}
