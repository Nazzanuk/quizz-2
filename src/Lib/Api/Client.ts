import type {
  AccountResponse,
  AdminQuizRow,
  AdminUserRow,
  AnalyticsSummary,
  DedupeBurst,
  GenerateQuizRequest,
  HostRecapRequest,
  HostRecapResponse,
  HostSessionResponse,
  PlayerProfile,
  Question,
  Quiz,
  QuizLeaderboard,
  QuizRun,
  QuizRunDetail,
  QuizStatus,
  QuizVisibility,
  QuizWithQuestions,
  ReportedQuiz,
  ResultsSummary,
  SaveResultRequest,
  StatsResponse,
  TopQuiz,
} from '../Types';

const BASE = '/api';

// Carries the HTTP status + machine-readable error code so callers can branch
// on e.g. 401 (sign in) vs 403 'out_of_credits' without string-matching.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code = typeof body.error === 'string' ? body.error : `http_${res.status}`;
    // Prefer a human-readable `message` (e.g. the 429 limiter copy) over the
    // machine-readable `error` code so raw tokens like "rate_limited" never
    // reach the user.
    const message =
      typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
          ? body.error
          : `Request failed: ${res.status}`;
    throw new ApiError(res.status, code, message);
  }
  return res.json();
}

export function fetchAccount(): Promise<AccountResponse> {
  return request('/account');
}

export function updateUsername(username: string): Promise<{ username: string }> {
  return request('/account', {
    method: 'PATCH',
    body: JSON.stringify({ username }),
  });
}

export function deleteAccount(): Promise<{ ok: true }> {
  return request('/account', { method: 'DELETE' });
}

// Fetches the user's data export as a Blob (for a client-triggered download).
export async function fetchAccountExport(): Promise<Blob> {
  const res = await fetch(`${BASE}/account/export`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `http_${res.status}`, body.error ?? 'Export failed');
  }
  return res.blob();
}

export function fetchLeaderboard(
  quizId: string,
  limit = 10,
  anonId?: string,
): Promise<QuizLeaderboard> {
  const anon = anonId ? `&anonId=${encodeURIComponent(anonId)}` : '';
  return request(`/quizzes/${quizId}/leaderboard?limit=${limit}${anon}`);
}

// Sets a guest's public leaderboard name.
export function setAnonName(anonId: string, username: string): Promise<{ username: string }> {
  return request('/anon', {
    method: 'PATCH',
    body: JSON.stringify({ anonId, username }),
  });
}

// After sign-in, migrate a guest's runs (and optionally adopt their name).
export function claimAnon(
  anonId: string,
  username?: string,
): Promise<{ claimed: number; usernameSet: boolean }> {
  return request('/account/claim', {
    method: 'POST',
    body: JSON.stringify({ anonId, username }),
  });
}

export function fetchTopQuizzes(limit = 5): Promise<TopQuiz[]> {
  return request(`/discover?limit=${limit}`);
}

// Fire-and-forget analytics beacon for a share action; failures are ignored.
export function trackShare(quizId: string): void {
  void fetch(`${BASE}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'quiz_shared', quizId }),
  }).catch(() => {});
}

export function reportQuiz(quizId: string, reason?: string): Promise<{ ok: true }> {
  return request(`/quizzes/${quizId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

export function fetchReportedQuizzes(): Promise<ReportedQuiz[]> {
  return request('/admin/reports');
}

export function fetchAnalytics(): Promise<AnalyticsSummary> {
  return request('/admin/analytics');
}

export function setQuizStatus(quizId: string, status: QuizStatus): Promise<{ ok: true; status: QuizStatus }> {
  return request(`/admin/quizzes/${quizId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// --- Admin dashboard -------------------------------------------------------

export function fetchAdminUsers(): Promise<AdminUserRow[]> {
  return request('/admin/users');
}

export function setUserCredits(userId: string, credits: number): Promise<{ ok: true; credits: number }> {
  return request(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ credits }),
  });
}

export function deleteAdminUser(userId: string): Promise<{ ok: true }> {
  return request(`/admin/users/${userId}`, { method: 'DELETE' });
}

export function fetchAdminQuizzes(search?: string, limit = 100): Promise<AdminQuizRow[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search?.trim()) params.set('search', search.trim());
  return request(`/admin/quizzes?${params.toString()}`);
}

export function setQuizVisibility(quizId: string, visibility: QuizVisibility): Promise<{ ok: true }> {
  return request(`/admin/quizzes/${quizId}`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  });
}

export function deleteAdminQuiz(quizId: string): Promise<{ ok: true }> {
  return request(`/admin/quizzes/${quizId}`, { method: 'DELETE' });
}

export function previewDedupe(windowMin?: number): Promise<{ bursts: DedupeBurst[]; totalToDelete: number }> {
  return request('/admin/maintenance', {
    method: 'POST',
    body: JSON.stringify({ action: 'dedupe-preview', windowMin }),
  });
}

export function applyDedupe(windowMin?: number): Promise<{ deleted: number }> {
  return request('/admin/maintenance', {
    method: 'POST',
    body: JSON.stringify({ action: 'dedupe-apply', windowMin }),
  });
}

export function resetAllCredits(): Promise<{ users: number }> {
  return request('/admin/maintenance', {
    method: 'POST',
    body: JSON.stringify({ action: 'reset-credits' }),
  });
}

export function backfillOwners(): Promise<{ assigned: number }> {
  return request('/admin/maintenance', {
    method: 'POST',
    body: JSON.stringify({ action: 'backfill-owners' }),
  });
}

export function fetchQuizzes(): Promise<Quiz[]> {
  return request('/quizzes');
}

export function fetchQuiz(id: string): Promise<QuizWithQuestions> {
  return request(`/quizzes/${id}`);
}

export function createQuiz(data: {
  title: string;
  format: string;
  description?: string;
  topic?: string;
}): Promise<Quiz> {
  return request('/quizzes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateQuiz(
  id: string,
  data: Partial<Pick<Quiz, 'title' | 'description' | 'questionsPerRun' | 'visibility'>>,
): Promise<Quiz> {
  return request(`/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteQuiz(id: string): Promise<void> {
  return request(`/quizzes/${id}`, { method: 'DELETE' });
}

export function updateQuestion(
  quizId: string,
  questionId: string,
  data: {
    questionText?: string;
    answerText?: string;
    options?: string[];
    imagePrompt?: string | null;
    imageUrl?: string | null;
  },
): Promise<Question> {
  return request(`/quizzes/${quizId}/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function regenerateQuestionImage(
  quizId: string,
  questionId: string,
  imagePrompt: string,
): Promise<Question> {
  return request(`/quizzes/${quizId}/questions/${questionId}/image`, {
    method: 'POST',
    body: JSON.stringify({ imagePrompt }),
  });
}

export function generateQuiz(data: GenerateQuizRequest): Promise<Quiz> {
  return request('/generate/quiz', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function generateImage(quizId: string, topic: string): Promise<void> {
  return request('/generate/image', {
    method: 'POST',
    body: JSON.stringify({ quizId, topic }),
  });
}

export function getResultsSummary(quizId: string): Promise<ResultsSummary> {
  return request(`/quizzes/${quizId}/results`);
}

export function fetchQuizRuns(quizId: string, limit = 5): Promise<QuizRun[]> {
  return request(`/quizzes/${quizId}/runs?limit=${limit}`);
}

export function fetchRun(quizId: string, runId: string): Promise<QuizRunDetail> {
  return request(`/quizzes/${quizId}/runs/${runId}`);
}

export function fetchStats(limit = 12): Promise<StatsResponse> {
  return request(`/stats?limit=${limit}`);
}

export function saveResult(
  quizId: string,
  data: SaveResultRequest,
): Promise<void> {
  return request(`/quizzes/${quizId}/results`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchHostSession(
  quizId: string,
  data: {
    mode: SaveResultRequest['mode'];
    hostPersona: SaveResultRequest['hostPersona'];
    profile: PlayerProfile;
  },
): Promise<HostSessionResponse> {
  return request(`/quizzes/${quizId}/host/session`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function generateHostRecap(
  quizId: string,
  data: HostRecapRequest,
): Promise<HostRecapResponse> {
  return request(`/quizzes/${quizId}/host/recap`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function generateMoreQuestions(quizId: string, count: number): Promise<Question[]> {
  return request(`/quizzes/${quizId}/questions/generate`, {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
}

export function createQuestion(quizId: string): Promise<Question> {
  return request(`/quizzes/${quizId}/questions`, { method: 'POST' });
}

export function deleteQuestion(quizId: string, questionId: string): Promise<void> {
  return request(`/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' });
}
