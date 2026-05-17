'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => unknown;
};

export function useTransitionRouter() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
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

  const back = useCallback(() => {
    if (typeof document !== 'undefined') {
      const doc = document as ViewTransitionDocument;
      if (doc.startViewTransition) {
        doc.startViewTransition(() => router.back());
        return;
      }
    }
    router.back();
  }, [router]);

  return { navigate, back };
}
