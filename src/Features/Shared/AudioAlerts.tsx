'use client';

import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { addToastAtom } from '@/State/UiAtoms';
import { subscribeAudioIssues } from '@/Lib/AudioDiagnostics';

export default function AudioAlerts() {
  const addToast = useSetAtom(addToastAtom);
  const seenCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => subscribeAudioIssues((issues) => {
    issues.forEach((issue) => {
      if (seenCodesRef.current.has(issue.code)) return;
      seenCodesRef.current.add(issue.code);
      addToast({
        type: issue.level === 'error' ? 'error' : 'info',
        message: formatIssueMessage(issue.message, issue.detail),
      });
    });
  }), [addToast]);

  return null;
}

function formatIssueMessage(message: string, detail?: string): string {
  if (!detail) return message;
  return `${message} ${detail}`;
}
