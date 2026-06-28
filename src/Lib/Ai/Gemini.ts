import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  Type,
  type GenerateContentResponse,
  type SafetySetting,
  type Schema,
} from '@google/genai';
import {
  normalizeQuestionDifficulty,
  normalizeQuizFormat,
  type HostMode,
  type PlayerProfile,
  type Question,
  type QuestionDifficulty,
  type QuizFormat,
} from '../Types';
import { requireServerEnv } from '../Env';
import {
  AI_GENERATION_TIMEOUT_MS,
  AI_TEXT_TIMEOUT_MS,
  GEMINI_MODEL,
  MAX_GENERATION_OUTPUT_TOKENS,
} from '../Constants';

// Constructed lazily so a missing key surfaces at generation time with a clear
// error, rather than crashing module import during build.
let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey: requireServerEnv('GOOGLE_AI_API_KEY') });
  }
  return genAIInstance;
}

interface GenerateJsonOpts {
  schema: Schema;
  contents: string;
  temperature?: number;
  // Enable Grounding with Google Search so factual content is checked against
  // live results instead of the model's (Jan 2025) training cutoff.
  grounded?: boolean;
  // When true, the call must produce evidence that Google Search actually ran;
  // if it can't be confirmed (even after a retry) it throws instead of falling
  // back to an ungrounded, possibly-stale answer. Used for recency-critical
  // topics so a quiz about a current sports season never ships from memory.
  requireGrounding?: boolean;
  thinkingLevel?: ThinkingLevel;
  maxOutputTokens?: number;
  timeoutMs?: number;
  // The caller's request signal. When the client disconnects (e.g. it gave up
  // on a slow generation) this aborts the model call instead of letting the
  // work finish and silently create a quiz nobody is waiting for.
  abortSignal?: AbortSignal;
}

// Thrown when a recency-critical generation could not be grounded with live
// search. Callers (the quiz route) map this to a retryable error and refund the
// credit rather than serving stale content.
export class GroundingRequiredError extends Error {
  constructor() {
    super(
      "Couldn't confirm up-to-date information for this topic right now. Please try again in a moment.",
    );
    this.name = 'GroundingRequiredError';
  }
}

// Single entry point for structured (JSON-schema) generation. On Gemini 3.5,
// Google Search grounding can run alongside a response schema — but if a
// grounded call returns nothing (a blocked/empty edge case with tool+schema
// combos), it retries once without grounding so a quiz is still produced.
async function generateJson(opts: GenerateJsonOpts): Promise<string> {
  // One deadline SHARED across both the grounded and ungrounded attempts, rather
  // than a fresh timeout per attempt — otherwise a grounded call that hangs to
  // the limit and then falls back could pin a worker for ~2x the timeout. Combine
  // it with the caller's request signal so a disconnected client cancels too.
  const deadline = AbortSignal.timeout(opts.timeoutMs ?? AI_TEXT_TIMEOUT_MS);
  const abortSignal = opts.abortSignal
    ? AbortSignal.any([opts.abortSignal, deadline])
    : deadline;
  const run = (useTools: boolean) =>
    getGenAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: opts.contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: opts.schema,
        safetySettings: SAFETY_SETTINGS,
        maxOutputTokens: opts.maxOutputTokens ?? MAX_GENERATION_OUTPUT_TOKENS,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.thinkingLevel ? { thinkingConfig: { thinkingLevel: opts.thinkingLevel } } : {}),
        ...(useTools ? { tools: [{ googleSearch: {} }] } : {}),
        abortSignal,
      },
    });

  if (opts.grounded) {
    const requireGrounding = opts.requireGrounding ?? false;
    // Give grounding a second shot before giving up — search activity is
    // sometimes flaky on the first call. Only worth the extra cost/latency when
    // grounding is mandatory.
    const maxAttempts = requireGrounding ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resp = await run(true);
        const text = resp.text;
        if (text && text.trim()) {
          // Passing the search tool doesn't guarantee the model used it. If no
          // search actually ran, the answer came straight from (stale) training
          // data — which is exactly how recency-sensitive quizzes drift to an
          // old season.
          if (didGroundWithSearch(resp)) return text;
          if (!requireGrounding) {
            console.warn(
              '[gemini] grounded call produced no Google Search activity; answer may rely on stale training data',
            );
            return text;
          }
          console.warn(
            `[gemini] recency-critical generation did not ground (attempt ${attempt}/${maxAttempts})`,
          );
        } else {
          console.warn(
            `[gemini] grounded generation returned empty (attempt ${attempt}/${maxAttempts})`,
          );
        }
      } catch (err) {
        // An abort (client disconnected, or the shared deadline fired) means the
        // signal is now dead — retrying or falling back would hang on the
        // already-aborted signal or do pointless work. Propagate it. Only a
        // genuine grounded-specific failure continues.
        if (abortSignal.aborted) throw err;
        console.warn(
          `[gemini] grounded generation failed (attempt ${attempt}/${maxAttempts}):`,
          err instanceof Error ? err.message : err,
        );
      }
      // Don't start another attempt on a dead signal.
      if (abortSignal.aborted) break;
    }

    if (abortSignal.aborted) throw new Error('Generation aborted');
    // Grounded attempts exhausted. For recency-critical topics, refuse to serve
    // a stale answer; the caller refunds the credit and asks the user to retry.
    if (requireGrounding) {
      throw new GroundingRequiredError();
    }
    // Otherwise a transient tool/grounding error still yields a quiz.
    return (await run(false)).text ?? '';
  }

  return (await run(false)).text ?? '';
}

// True when the response carries evidence that Google Search actually ran
// (a web query was issued or a retrieved chunk was attached), as opposed to the
// model answering from memory despite the tool being available.
function didGroundWithSearch(resp: GenerateContentResponse): boolean {
  const meta = resp.candidates?.[0]?.groundingMetadata;
  if (!meta) return false;
  const queries = meta.webSearchQueries?.length ?? 0;
  const chunks = meta.groundingChunks?.length ?? 0;
  return queries > 0 || chunks > 0;
}

const quizResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          format: { type: Type.STRING },
          questionText: { type: Type.STRING },
          answerText: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          imageDescription: {
            type: Type.STRING,
            nullable: true,
          },
          optionImageDescriptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING, nullable: true },
            nullable: true,
          },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          explanation: { type: Type.STRING },
          factText: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'format',
          'questionText',
          'answerText',
          'options',
          'category',
          'difficulty',
          'explanation',
          'factText',
          'tags',
        ],
      },
    },
  },
  required: ['title', 'description', 'questions'],
};

const metadataResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          explanation: { type: Type.STRING },
          factText: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['id', 'category', 'difficulty', 'explanation', 'factText', 'tags'],
      },
    },
  },
  required: ['questions'],
};

const lineResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
  },
  required: ['text'],
};

type GeneratedQuestionFormat = Exclude<QuizFormat, 'jeopardy'>;

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: {
    format: GeneratedQuestionFormat;
    questionText: string;
    answerText: string;
    options: string[];
    imageDescription: string | null;
    optionImageDescriptions: (string | null)[] | null;
    category: string;
    difficulty: QuestionDifficulty | null;
    explanation: string;
    factText: string;
    tags: string[];
  }[];
}

export interface GeneratedQuestionMetadata {
  id: string;
  category: string;
  difficulty: QuestionDifficulty | null;
  explanation: string;
  factText: string;
  tags: string[];
}

// Decide whether a topic depends on information too recent to trust to the
// model's training data. Only these topics enforce grounding (and hard-fail if
// it can't be confirmed) — evergreen topics like "Roman history" or "1990s
// pop" must NOT hard-fail just because the model answered them from memory
// without searching.
function isRecencySensitive(opts: { topic?: string; material?: string }): boolean {
  const text = `${opts.topic ?? ''} ${opts.material ?? ''}`.toLowerCase();
  if (!text.trim()) return false;

  // Explicit relative-time language always needs live data.
  if (
    /\b(current|currently|latest|most recent|recent|recently|nowadays|present[- ]day|this (?:year|season|month|week)|ongoing|so far|to date|up[- ]to[- ]date|upcoming|next (?:year|season)|reigning|defending champion|in office|who is the)\b/.test(
      text,
    )
  ) {
    return true;
  }

  // Periods at or after roughly the model's training cutoff can't be answered
  // from memory. Anchor the threshold to the current year so it ages correctly.
  const threshold = new Date().getUTCFullYear() - 1;

  // Four-digit years, e.g. 2025, 2026.
  for (const m of text.matchAll(/\b(?:19|20)\d{2}\b/g)) {
    if (Number(m[0]) >= threshold) return true;
  }

  // Two-digit consecutive season notation, e.g. 25/26, 24-25 (but not a ratio
  // like 16/9 or a date like 12/25 — a season's two numbers are consecutive).
  for (const m of text.matchAll(/\b(\d{2})\s?[/-]\s?(\d{2})\b/g)) {
    const start = Number(m[1]);
    if (Number(m[2]) === start + 1 && 2000 + start >= threshold) return true;
  }

  return false;
}

export async function generateQuiz(opts: {
  topic?: string;
  material?: string;
  count: number;
  existingQuestions?: string[];
  abortSignal?: AbortSignal;
}): Promise<GeneratedQuiz> {
  const text = await generateJson({
    schema: quizResponseSchema,
    contents: buildPrompt(opts),
    grounded: true,
    // Only enforce grounding for topic-based generation. A material-based quiz
    // grounds in the pasted source, so live search may rightly not fire — hard-
    // failing those would be wrong.
    requireGrounding: !opts.material?.trim() && isRecencySensitive(opts),
    // MEDIUM rather than HIGH: grounding already anchors factual accuracy, and
    // HIGH thinking was the dominant cost in a 30-50s generation for little
    // quality gain on quiz questions.
    thinkingLevel: ThinkingLevel.MEDIUM,
    timeoutMs: AI_GENERATION_TIMEOUT_MS,
    abortSignal: opts.abortSignal,
  });
  return parseGeneratedQuiz(text);
}

export async function generateQuestionMetadata(opts: {
  topic?: string | null;
  title?: string | null;
  questions: Question[];
}): Promise<GeneratedQuestionMetadata[]> {
  const text = await generateJson({
    schema: metadataResponseSchema,
    contents: buildMetadataPrompt(opts),
    grounded: true,
    thinkingLevel: ThinkingLevel.MEDIUM,
    timeoutMs: AI_GENERATION_TIMEOUT_MS,
  });
  const parsed = JSON.parse(text) as {
    questions: Array<{
      id: string;
      category: string;
      difficulty: string;
      explanation: string;
      factText: string;
      tags: string[];
    }>;
  };

  return parsed.questions.map((item) => ({
    id: item.id,
    category: item.category,
    difficulty: normalizeQuestionDifficulty(item.difficulty),
    explanation: item.explanation,
    factText: item.factText,
    tags: item.tags ?? [],
  }));
}

export async function generateHostSessionIntro(opts: {
  title: string;
  topic?: string | null;
  count: number;
  mode: HostMode;
  profile: PlayerProfile;
  categories: string[];
  hardCount: number;
}): Promise<string> {
  const text = await generateJson({
    schema: lineResponseSchema,
    contents: buildHostIntroPrompt(opts),
    temperature: 1.1,
    thinkingLevel: ThinkingLevel.MINIMAL,
    maxOutputTokens: 2048,
  });
  return parseLine(text);
}

export async function generateHostRecap(opts: {
  title: string;
  topic?: string | null;
  mode: HostMode;
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  wrongCount: number;
  fastestAnswerMs: number | null;
  averageAnswerMs: number | null;
  previousBest: number | null;
  isNewBest: boolean;
  strengths: string[];
  weaknesses: string[];
  profile: PlayerProfile;
}): Promise<string> {
  const text = await generateJson({
    schema: lineResponseSchema,
    contents: buildHostRecapPrompt(opts),
    temperature: 1.1,
    thinkingLevel: ThinkingLevel.MINIMAL,
    maxOutputTokens: 2048,
  });
  return parseLine(text);
}

// Block medium-and-above harmful content across categories. Generation that
// trips these returns no candidates, surfacing as an error the caller refunds
// the credit for.
const SAFETY_SETTINGS: SafetySetting[] = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

const HOST_VARIETY_RULES = [
  'Variety rules: every line must feel newly written, never templated.',
  'Do NOT open with stock quiz-host phrases such as "Right then", "Right,", "Well, well", "Ah,", "Ladies and gentlemen", "Alright" or "So,".',
  'Vary sentence structure and vocabulary between generations — pick a fresh angle (the topic, the player history, the difficulty, the mood) rather than reusing a formula.',
].join('\n');

// The model's training data has a hard cutoff, so it has no parametric
// knowledge of anything after it (a current sports season, "this year"
// anything, latest standings/records/office-holders). Stamping the real date
// into the prompt gives it an anchor to resolve relative references against,
// and tells it when to trust Google Search over its (stale) memory. Without
// this the model silently answers about the most recent period it was trained
// on — e.g. a "2025/26 season" request drifts to 2024/25.
function formatToday(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildRecencyInstructions(today: string): string {
  return [
    `Today's date is ${today}. Treat this as the authoritative current date — your own training data is older and may be out of date.`,
    'Many topics are time-sensitive (current sports seasons, "latest"/"this year" anything, league standings, records, prices, who currently holds a role). For these:',
    '- Rely on the Google Search results you are grounded with, NOT your prior knowledge.',
    '- Resolve relative or ambiguous time references against today\'s date. A sports season written like "2025/26" means the season running across the 2025 and 2026 calendar years — never answer about an earlier season.',
    '- For any statistic (top scorer, goals, points, league position, win/loss counts), report it as of today\'s date and count only fixtures or events that have actually been completed by now. Never mix figures from different seasons.',
    '- If the requested period is still in progress or in the future, base questions only on what has happened so far, and make the time frame explicit in the question text (e.g. "as of June 2026").',
    '- If you are unsure of a current figure, search for it — do not silently substitute an earlier season or year.',
  ].join('\n');
}

function buildPrompt(opts: {
  topic?: string;
  material?: string;
  count: number;
  existingQuestions?: string[];
}): string {
  const source = opts.material
    ? `Based on the following material:\n\n${opts.material}`
    : `About the topic: ${opts.topic}`;

  const parts = [
    `Generate a quiz with exactly ${opts.count} questions.`,
    source,
    buildRecencyInstructions(formatToday()),
    FORMAT_INSTRUCTIONS,
    HOST_METADATA_INSTRUCTIONS,
    'Generate a short, descriptive title and a one-sentence description.',
    IMAGE_DESCRIPTION_RULES,
    'Return valid JSON matching the schema.',
  ];

  if (opts.existingQuestions?.length) {
    parts.push(
      `Do not duplicate any of these existing questions:\n${opts.existingQuestions.join('\n')}`,
    );
  }

  return parts.join('\n\n');
}

const IMAGE_DESCRIPTION_RULES = [
  'Image descriptions are sent to an image-generation model that REJECTS prompts naming real people, brand names, trademarked logos, copyrighted characters, or specific copyrighted artworks. Failed prompts mean no image — so every description must be safe.',
  '',
  'Rules for imageDescription and optionImageDescriptions:',
  '- Describe the subject by its VISUAL ATTRIBUTES, never by name. Use era, materials, posture, setting, colors, distinctive features.',
  '- Examples of safe rewrites:',
  '  • "Eiffel Tower" → "tall wrought-iron lattice tower at dusk, Parisian skyline"',
  '  • "Mona Lisa" → "16th-century Italian oil portrait of a seated woman with an enigmatic smile, dark landscape behind"',
  '  • "Albert Einstein" → "elderly man with wild white hair and a thick moustache, early 20th century, contemplative expression"',
  '  • "Coca-Cola bottle" → "curvy glass soft-drink bottle with a deep red label, mid-century styling"',
  '  • "Mickey Mouse" → AVOID ENTIRELY — pick a different question rather than describe trademarked characters.',
  '- Skip the image (set to null) when the subject is a fictional character, branded product, living public figure, or anything you cannot describe safely.',
  '- Skip the image when the question can be answered fully from text alone (e.g. abstract concepts, math, dates without a visual subject).',
  '- The image accompanies the QUESTION, not the literal answer phrase. It depicts the subject in a way that supports the question without trivially spelling out the answer in pixels (no captions, no text in the image).',
  '',
  'CRITICAL — the image must never give the answer away:',
  '- Before writing imageDescription, check it against answerText. If someone could pick the correct option just by looking at the image, the description is wrong.',
  '- Never include answerText, a synonym of it, or its distinctive identifying features in imageDescription. Depict the subject of the QUESTION STEM instead (the thing being asked about), not the thing that answers it.',
  '- Example: "Which planet is known as the Red Planet?" with answer "Mars" must NOT get "a red planet against a starfield". Use a neutral scene like "a telescope pointed at a night sky" — or set imageDescription to null.',
  '- Example: "What is the largest big cat?" with answer "Tiger" must NOT get "a striped orange big cat". Use something answer-neutral, or null.',
  '- When in doubt, set imageDescription to null. A missing image is always better than a spoiler.',
  '',
  'imageDescription: a single concise visual description (or null). Use when a recognizable subject genuinely helps.',
  '',
  'optionImageDescriptions: only for mcq questions where the four answer options are visually distinct subjects (flags, landmarks, species, artworks, anatomical parts, etc). Provide an array of 4 descriptions in the same order as options. Each must follow the visual-attribute rules above. Each image must be unambiguous and isolated on a plain background so it can stand alone in a 2×2 grid. Set to null for fill_blank and odd_one_out questions, and set to null when text options suffice.',
].join('\n');

const FORMAT_INSTRUCTIONS = [
  'Use a mix of these question formats: mcq, fill_blank, and odd_one_out.',
  'Favour multiple-choice: roughly 60-70% of the questions should be mcq (the majority, but not all of them). Use fill_blank and odd_one_out for the remainder to keep things varied. When the count is 3 or more, include at least one fill_blank or odd_one_out question.',
  '',
  'Format rules:',
  '- mcq: questionText asks a standard question. options must contain exactly 4 choices. answerText is the correct choice, and the correct choice must be the first item in options.',
  '- fill_blank: questionText must contain exactly one "___" blank replacing the missing word or short phrase. options must contain exactly 4 choices. answerText is the missing word or phrase, and it must be the first item in options.',
  '- odd_one_out: questionText should clearly explain the shared theme, such as "Three of these are mammals. Which is the odd one out?" options must contain exactly 4 items. answerText is the item that does not belong, and it must be the first item in options.',
  '',
  'General rules:',
  '- Every question must have exactly 4 options.',
  '- Keep distractors plausible, concise, and distinct.',
  '- Do not use the jeopardy format in generated output. Jeopardy is handled separately at play time.',
].join('\n');

const HOST_METADATA_INSTRUCTIONS = [
  'For every question also provide host-support metadata.',
  '- category: a concise category label like Geography, Film, Space, Biology, Football, Literature.',
  '- difficulty: one of easy, medium, hard.',
  '- explanation: 1 short sentence that clearly explains why the answer is correct.',
  '- factText: 1 short, vivid fact or comparison the host can say after the reveal.',
  '- tags: 2 to 4 short lowercase tags that capture subtopics or themes.',
  '- explanation and factText must be safe for all audiences, concise, and readable aloud.',
].join('\n');

function buildMetadataPrompt(opts: {
  topic?: string | null;
  title?: string | null;
  questions: Question[];
}): string {
  const context = [
    opts.title ? `Quiz title: ${opts.title}` : '',
    opts.topic ? `Quiz topic: ${opts.topic}` : '',
  ].filter(Boolean).join('\n');

  const questionsBlock = opts.questions.map((question) => (
    [
      `id: ${question.id}`,
      `question: ${question.questionText}`,
      `answer: ${question.answerText}`,
      `options: ${(question.options ?? []).join(' | ')}`,
    ].join('\n')
  )).join('\n\n');

  return [
    'You are enriching quiz questions for a sarcastic but educational pub-quiz host.',
    `Today's date is ${formatToday()}. For any time-sensitive fact, rely on Google Search results rather than your (older) training data, and make sure explanations and facts are current as of today.`,
    context,
    'For each question, return its id plus category, difficulty, explanation, factText, and tags.',
    'Difficulty must be one of easy, medium, hard.',
    'Explanation should be factual and direct. factText should be memorable and spoken-friendly.',
    'Do not change or restate the question ids.',
    questionsBlock,
  ].filter(Boolean).join('\n\n');
}

function buildHostIntroPrompt(opts: {
  title: string;
  topic?: string | null;
  count: number;
  mode: HostMode;
  profile: PlayerProfile;
  categories: string[];
  hardCount: number;
}): string {
  return [
    'Write one short opening line for a quiz round in the voice of a sarcastic British pub quiz host.',
    'Keep it to 1-2 sentences and under 45 words.',
    `Quiz title: ${opts.title}`,
    opts.topic ? `Topic: ${opts.topic}` : '',
    `Question count: ${opts.count}`,
    `Mode: ${opts.mode}`,
    `Likely categories: ${opts.categories.join(', ') || 'mixed bag'}`,
    `Hard question count: ${opts.hardCount}`,
    `Player total runs: ${opts.profile.totalRuns}`,
    `Player best score: ${opts.profile.bestPct ?? 'none yet'}%`,
    'Mention the theme or difficulty profile when useful. Keep the tone sharp, playful, and confident.',
    HOST_VARIETY_RULES,
  ].filter(Boolean).join('\n');
}

function buildHostRecapPrompt(opts: {
  title: string;
  topic?: string | null;
  mode: HostMode;
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  wrongCount: number;
  fastestAnswerMs: number | null;
  averageAnswerMs: number | null;
  previousBest: number | null;
  isNewBest: boolean;
  strengths: string[];
  weaknesses: string[];
  profile: PlayerProfile;
}): string {
  return [
    'Write one short personalized recap in the voice of a sarcastic British pub quiz host.',
    'Keep it to 2 sentences max and under 65 words.',
    `Quiz title: ${opts.title}`,
    opts.topic ? `Topic: ${opts.topic}` : '',
    `Mode: ${opts.mode}`,
    `Score: ${opts.correct}/${opts.total} (${opts.score}%)`,
    `Best streak: ${opts.bestStreak}`,
    `Wrong answers: ${opts.wrongCount}`,
    `Fastest answer ms: ${opts.fastestAnswerMs ?? 'unknown'}`,
    `Average answer ms: ${opts.averageAnswerMs ?? 'unknown'}`,
    `Previous best: ${opts.previousBest ?? 'none'}%`,
    `Is new best: ${opts.isNewBest ? 'yes' : 'no'}`,
    `Strengths: ${opts.strengths.join(', ') || 'none obvious'}`,
    `Weaknesses: ${opts.weaknesses.join(', ') || 'none obvious'}`,
    `Player total runs: ${opts.profile.totalRuns}`,
    'Make it feel like a mini performance review, witty but not mean, and mention a comeback, wobble, pace, or streak when possible.',
    HOST_VARIETY_RULES,
  ].filter(Boolean).join('\n');
}

function parseGeneratedQuiz(text: string): GeneratedQuiz {
  const parsed = JSON.parse(text) as {
    title: string;
    description: string;
    questions: Array<{
      format: string;
      questionText: string;
      answerText: string;
      options: string[];
      imageDescription?: string | null;
      optionImageDescriptions?: (string | null)[] | null;
      category: string;
      difficulty: string;
      explanation: string;
      factText: string;
      tags: string[];
    }>;
  };

  return {
    title: parsed.title,
    description: parsed.description,
    questions: parsed.questions.map((question) => ({
      format: normalizeGeneratedQuestionFormat(question.format),
      questionText: question.questionText,
      answerText: question.answerText,
      options: question.options,
      imageDescription: question.imageDescription ?? null,
      optionImageDescriptions: question.optionImageDescriptions ?? null,
      category: question.category,
      difficulty: normalizeQuestionDifficulty(question.difficulty),
      explanation: question.explanation,
      factText: question.factText,
      tags: question.tags ?? [],
    })),
  };
}

function parseLine(text: string): string {
  const parsed = JSON.parse(text) as { text: string };
  return parsed.text.trim();
}

function normalizeGeneratedQuestionFormat(value: string): GeneratedQuestionFormat {
  const format = normalizeQuizFormat(value);
  if (format === 'fill_blank' || format === 'odd_one_out') return format;
  return 'mcq';
}
