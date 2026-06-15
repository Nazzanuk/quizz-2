import type {
  AccountResponse,
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
    throw new ApiError(res.status, code, body.error ?? `Request failed: ${res.status}`);
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

export function fetchLeaderboard(quizId: string, limit = 10): Promise<QuizLeaderboard> {
  return request(`/quizzes/${quizId}/leaderboard?limit=${limit}`);
}

export function fetchTopQuizzes(limit = 5): Promise<TopQuiz[]> {
  return request(`/discover?limit=${limit}`);
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

export function setQuizStatus(quizId: string, status: QuizStatus): Promise<{ ok: true; status: QuizStatus }> {
  return request(`/admin/quizzes/${quizId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
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
