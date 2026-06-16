import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
  type SafetySetting,
  type Schema,
} from '@google/generative-ai';
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
import { AI_TEXT_TIMEOUT_MS } from '../Constants';

// Applied to every model call so a hung Gemini request can't pin a server worker.
const REQUEST_OPTIONS = { timeout: AI_TEXT_TIMEOUT_MS } as const;

// Constructed lazily so a missing key surfaces at generation time with a clear
// error, rather than crashing module import during build.
let genAIInstance: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(requireServerEnv('GOOGLE_AI_API_KEY'));
  }
  return genAIInstance;
}

const quizResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          format: { type: SchemaType.STRING },
          questionText: { type: SchemaType.STRING },
          answerText: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          imageDescription: {
            type: SchemaType.STRING,
            nullable: true,
          },
          optionImageDescriptions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING, nullable: true },
            nullable: true,
          },
          category: { type: SchemaType.STRING },
          difficulty: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
          factText: { type: SchemaType.STRING },
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
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
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          difficulty: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
          factText: { type: SchemaType.STRING },
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['id', 'category', 'difficulty', 'explanation', 'factText', 'tags'],
      },
    },
  },
  required: ['questions'],
};

const lineResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    text: { type: SchemaType.STRING },
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

export async function generateQuiz(opts: {
  topic?: string;
  material?: string;
  count: number;
  existingQuestions?: string[];
}): Promise<GeneratedQuiz> {
  const model = getJsonModel(quizResponseSchema);
  const prompt = buildPrompt(opts);
  const result = await model.generateContent(prompt, REQUEST_OPTIONS);
  const text = result.response.text();
  return parseGeneratedQuiz(text);
}

export async function generateQuestionMetadata(opts: {
  topic?: string | null;
  title?: string | null;
  questions: Question[];
}): Promise<GeneratedQuestionMetadata[]> {
  const model = getJsonModel(metadataResponseSchema);
  const result = await model.generateContent(buildMetadataPrompt(opts), REQUEST_OPTIONS);
  const text = result.response.text();
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
  const model = getJsonModel(lineResponseSchema, 1.1);
  const result = await model.generateContent(buildHostIntroPrompt(opts), REQUEST_OPTIONS);
  const text = result.response.text();
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
  const model = getJsonModel(lineResponseSchema, 1.1);
  const result = await model.generateContent(buildHostRecapPrompt(opts), REQUEST_OPTIONS);
  const text = result.response.text();
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

function getJsonModel(responseSchema: Schema, temperature?: number) {
  return getGenAI().getGenerativeModel({
    model: 'gemini-3-flash-preview',
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      ...(temperature !== undefined ? { temperature } : {}),
    },
  });
}

const HOST_VARIETY_RULES = [
  'Variety rules: every line must feel newly written, never templated.',
  'Do NOT open with stock quiz-host phrases such as "Right then", "Right,", "Well, well", "Ah,", "Ladies and gentlemen", "Alright" or "So,".',
  'Vary sentence structure and vocabulary between generations — pick a fresh angle (the topic, the player history, the difficulty, the mood) rather than reusing a formula.',
].join('\n');

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
