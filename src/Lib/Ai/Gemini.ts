import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from '@google/generative-ai';
import type { QuizFormat } from '../Types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          questionText: { type: SchemaType.STRING },
          answerText: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true,
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
        },
        required: ['questionText', 'answerText'],
      },
    },
  },
  required: ['title', 'description', 'questions'],
};

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: {
    questionText: string;
    answerText: string;
    options: string[] | null;
    imageDescription: string | null;
    optionImageDescriptions: (string | null)[] | null;
  }[];
}

export async function generateQuiz(opts: {
  topic?: string;
  material?: string;
  format: QuizFormat;
  count: number;
}): Promise<GeneratedQuiz> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const prompt = buildPrompt(opts);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as GeneratedQuiz;
}

function buildPrompt(opts: {
  topic?: string;
  material?: string;
  format: QuizFormat;
  count: number;
}): string {
  const source = opts.material
    ? `Based on the following material:\n\n${opts.material}`
    : `About the topic: ${opts.topic}`;

  const formatInstructions = FORMAT_PROMPTS[opts.format];

  return [
    `Generate a quiz with exactly ${opts.count} questions.`,
    source,
    formatInstructions,
    'Generate a short, descriptive title and a one-sentence description.',
    'For each question, set imageDescription to a concise visual description ONLY when an image of the subject would genuinely help answer the question (e.g. a landmark, artwork, flag, species, map location). Set to null otherwise.',
    'For MCQ questions where the answer options are visual things (flags, landmarks, species, artworks, people, etc.), set optionImageDescriptions to an array of 4 concise image descriptions — one per option, in the same order as options. Each entry describes what to show for that option. Set optionImageDescriptions to null for questions where text options suffice.',
    'Return valid JSON matching the schema.',
  ].join('\n\n');
}

const FORMAT_PROMPTS: Record<QuizFormat, string> = {
  mcq: 'Each question has exactly 4 options. The first option must be the correct answer. Include the correct answer in answerText.',
  flashcard: 'Each questionText is a concept or term. answerText is the explanation or definition. options should be null.',
  jeopardy: 'Each questionText is an answer/fact. answerText is the question it answers (phrased as "What is...?"). options should contain 3 distractor questions plus the correct one. The correct answerText must be first in options.',
};
