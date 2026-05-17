'use client';

import { useEffect, useState } from 'react';
import { getAudioIssues, subscribeAudioIssues, type AudioIssue } from '@/Lib/AudioDiagnostics';

export function useAudioIssues(channel?: AudioIssue['channel']): AudioIssue[] {
  const [issues, setIssues] = useState<AudioIssue[]>(() => getAudioIssues());

  useEffect(() => subscribeAudioIssues(setIssues), []);

  if (!channel) return issues;
  return issues.filter((issue) => issue.channel === channel);
}
