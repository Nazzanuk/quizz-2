export type HapticPattern = 'tap' | 'correct' | 'wrong' | 'success';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  correct: 12,
  wrong: [20, 40, 20],
  success: [10, 30, 10, 30, 40],
};

const STORAGE_KEY = 'quizz.hapticEnabled';

let enabled = true;

if (typeof window !== 'undefined') {
  enabled = localStorage.getItem(STORAGE_KEY) !== '0';
}

export function haptic(pattern: HapticPattern): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  navigator.vibrate(PATTERNS[pattern]);
}

export function getHapticEnabled(): boolean {
  return enabled;
}

export function setHapticEnabled(value: boolean): void {
  enabled = value;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  }
}
