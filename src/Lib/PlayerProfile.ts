import type {
  HostMode,
  HostPersona,
  PlayerCategoryProfile,
  PlayerProfile,
  Question,
  SaveResultAttemptInput,
} from './Types';
import {
  normalizeHostMode,
  normalizeHostPersona,
} from './Types';
import { nowISO } from './Utils';

const STORAGE_KEY = 'quizz.playerProfile';
const MAX_RECENT_RECAPS = 6;

function buildDefaultProfile(): PlayerProfile {
  return {
    totalRuns: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    bestPct: null,
    bestStreak: 0,
    fastestMs: null,
    lastPlayedAt: null,
    preferredMode: 'quick',
    hostVoiceEnabled: true,
    // New players see the full HUD (countdown number, "Question N of M", score,
    // streak, host panel). "Hide text UI" is an opt-in minimal mode.
    hideTextUi: false,
    readQuestionsAloud: true,
    selectedHost: 'sarcastic_pub_host',
    categories: {},
    quizzes: {},
    recentRecaps: [],
    anonId: '',
    username: null,
  };
}

// A stable per-device guest id, created lazily on the first anonymous run so a
// purely signed-in user never gets one (and so never triggers a claim).
export function getAnonId(): string {
  const profile = getPlayerProfile();
  if (profile.anonId) return profile.anonId;
  const anonId = crypto.randomUUID();
  savePlayerProfile({ ...profile, anonId });
  return anonId;
}

export function getLocalUsername(): string | null {
  return getPlayerProfile().username;
}

export function setLocalUsername(username: string): PlayerProfile {
  const profile = getPlayerProfile();
  const next = { ...profile, username };
  savePlayerProfile(next);
  return next;
}

// After a guest's runs are migrated into a signed-in account, drop the guest
// identity so a later signed-out session starts fresh (and never re-claims).
export function clearAnonIdentity(): PlayerProfile {
  const profile = getPlayerProfile();
  const next = { ...profile, anonId: '', username: null };
  savePlayerProfile(next);
  return next;
}

export function getPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined') return buildDefaultProfile();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    return {
      ...buildDefaultProfile(),
      ...parsed,
      preferredMode: normalizeHostMode(parsed.preferredMode),
      selectedHost: normalizeHostPersona(parsed.selectedHost),
      categories: parsed.categories ?? {},
      quizzes: parsed.quizzes ?? {},
      recentRecaps: parsed.recentRecaps ?? [],
    };
  } catch {
    return buildDefaultProfile();
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function setPlayerHostMode(mode: HostMode): PlayerProfile {
  const profile = getPlayerProfile();
  const next = { ...profile, preferredMode: mode };
  savePlayerProfile(next);
  return next;
}

export function setPlayerHostVoiceEnabled(enabled: boolean): PlayerProfile {
  const profile = getPlayerProfile();
  const next = { ...profile, hostVoiceEnabled: enabled };
  savePlayerProfile(next);
  return next;
}

export function setPlayerHideTextUi(enabled: boolean): PlayerProfile {
  const profile = getPlayerProfile();
  const next = { ...profile, hideTextUi: enabled };
  savePlayerProfile(next);
  return next;
}

export function setPlayerReadQuestionsAloud(enabled: boolean): PlayerProfile {
  const profile = getPlayerProfile();
  const next = { ...profile, readQuestionsAloud: enabled };
  savePlayerProfile(next);
  return next;
}

export function setPlayerHostPersona(persona: HostPersona): PlayerProfile {
  const profile = getPlayerProfile();
  const next = { ...profile, selectedHost: persona };
  savePlayerProfile(next);
  return next;
}

export function recordPlayerRun(
  profile: PlayerProfile,
  data: {
    quizId: string;
    questions: Question[];
    correct: number;
    total: number;
    bestStreak: number;
    recap: string | null;
    attempts: SaveResultAttemptInput[];
  },
): PlayerProfile {
  const next = structuredClone(profile);
  const now = nowISO();
  const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

  next.totalRuns += 1;
  next.totalQuestions += data.total;
  next.totalCorrect += data.correct;
  next.bestPct = next.bestPct === null ? pct : Math.max(next.bestPct, pct);
  next.bestStreak = Math.max(next.bestStreak, data.bestStreak);
  next.lastPlayedAt = now;

  const fastestRunAnswer = data.attempts.reduce<number | null>(
    (best, attempt) => best === null ? attempt.responseMs : Math.min(best, attempt.responseMs),
    null,
  );
  next.fastestMs = mergeFastest(next.fastestMs, fastestRunAnswer);

  if (data.recap) {
    next.recentRecaps = [data.recap, ...next.recentRecaps].slice(0, MAX_RECENT_RECAPS);
  }

  const quizProfile = next.quizzes[data.quizId] ?? {
    plays: 0,
    bestPct: null,
    lastPct: null,
    bestStreak: 0,
    fastestMs: null,
    lastPlayedAt: null,
    categories: {},
  };

  quizProfile.plays += 1;
  quizProfile.bestPct = quizProfile.bestPct === null ? pct : Math.max(quizProfile.bestPct, pct);
  quizProfile.lastPct = pct;
  quizProfile.bestStreak = Math.max(quizProfile.bestStreak, data.bestStreak);
  quizProfile.fastestMs = mergeFastest(quizProfile.fastestMs, fastestRunAnswer);
  quizProfile.lastPlayedAt = now;

  const questionById = new Map(data.questions.map((question) => [question.id, question]));
  for (const attempt of data.attempts) {
    const question = questionById.get(attempt.questionId);
    const category = question?.category?.trim();
    if (!category) continue;

    next.categories[category] = recordCategoryAttempt(next.categories[category], attempt, now);
    quizProfile.categories[category] = recordCategoryAttempt(
      quizProfile.categories[category],
      attempt,
      now,
    );
  }

  next.quizzes[data.quizId] = quizProfile;
  savePlayerProfile(next);
  return next;
}

function mergeFastest(current: number | null, candidate: number | null): number | null {
  if (candidate === null) return current;
  if (current === null) return candidate;
  return Math.min(current, candidate);
}

function recordCategoryAttempt(
  current: PlayerCategoryProfile | undefined,
  attempt: SaveResultAttemptInput,
  now: string,
): PlayerCategoryProfile {
  return {
    seen: (current?.seen ?? 0) + 1,
    correct: (current?.correct ?? 0) + (attempt.correct ? 1 : 0),
    fastestMs: mergeFastest(current?.fastestMs ?? null, attempt.responseMs),
    lastSeenAt: now,
  };
}
