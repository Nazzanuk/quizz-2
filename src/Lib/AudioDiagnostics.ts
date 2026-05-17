export type AudioIssueLevel = 'info' | 'warning' | 'error';
export type AudioIssueChannel = 'sfx' | 'voice';

export interface AudioIssue {
  code: string;
  channel: AudioIssueChannel;
  level: AudioIssueLevel;
  message: string;
  detail?: string;
  updatedAt: number;
}

type Listener = (issues: AudioIssue[]) => void;

const issueMap = new Map<string, AudioIssue>();
const listeners = new Set<Listener>();

export function reportAudioIssue(issue: Omit<AudioIssue, 'updatedAt'>): void {
  const next: AudioIssue = {
    ...issue,
    updatedAt: Date.now(),
  };
  issueMap.set(issue.code, next);
  emit();
}

export function clearAudioIssue(code: string): void {
  if (!issueMap.delete(code)) return;
  emit();
}

export function getAudioIssues(): AudioIssue[] {
  return [...issueMap.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function subscribeAudioIssues(listener: Listener): () => void {
  listeners.add(listener);
  listener(getAudioIssues());
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  const snapshot = getAudioIssues();
  listeners.forEach((listener) => listener(snapshot));
}
