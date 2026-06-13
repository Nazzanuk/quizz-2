'use client';

interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export async function shareLink(payload: SharePayload): Promise<'shared' | 'copied' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (err) {
      if (isAbortError(err)) return 'cancelled';
    }
  }

  await navigator.clipboard.writeText(payload.url);
  return 'copied';
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
