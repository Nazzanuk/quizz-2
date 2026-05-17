import type {
  GenerateQuizRequest,
  HostRecapRequest,
  HostRecapResponse,
  HostSessionResponse,
  PlayerProfile,
  Question,
  Quiz,
  QuizWithQuestions,
  ResultsSummary,
  SaveResultRequest,
} from '../Types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
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
  data: Partial<Pick<Quiz, 'title' | 'description'>>,
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
