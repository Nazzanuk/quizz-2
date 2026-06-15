import { nowISO } from './Utils';

// Quizzes the user has opened from a shared link but does not own. Tracked
// locally (these aren't in the user's own library, so the server feed never
// returns them) to power the "Discovered" section on the home screen.
export interface ViewedQuiz {
  id: string;
  title: string;
  coverImageUrl: string | null;
  questionCount: number;
  createdAt: string;
  viewedAt: string;
}

const STORAGE_KEY = 'quizz.viewedQuizzes';
const MAX_VIEWED = 24;

export function getViewedQuizzes(): ViewedQuiz[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ViewedQuiz[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.id === 'string');
  } catch {
    return [];
  }
}

function save(entries: ViewedQuiz[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_VIEWED)));
    // Let other mounted views (e.g. an open home screen) react in this tab.
    window.dispatchEvent(new Event('quizz:viewed-quizzes'));
  } catch {
    /* storage unavailable; tracking is best-effort */
  }
}

// Records (or refreshes) a viewed shared quiz, moving it to the front.
export function recordViewedQuiz(
  quiz: Omit<ViewedQuiz, 'viewedAt'>,
): void {
  if (typeof window === 'undefined') return;
  const existing = getViewedQuizzes().filter((entry) => entry.id !== quiz.id);
  save([{ ...quiz, viewedAt: nowISO() }, ...existing]);
}

export function removeViewedQuiz(id: string): void {
  if (typeof window === 'undefined') return;
  save(getViewedQuizzes().filter((entry) => entry.id !== id));
}
