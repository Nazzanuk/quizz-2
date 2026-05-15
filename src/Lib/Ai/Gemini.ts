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
    'For each question, set imageDescription to a concise visual description (e.g. "photo of the Eiffel Tower at dusk") ONLY when an image would genuinely help answer the question — such as identifying a landmark, artwork, flag, species, map location, or other visual subject. Set imageDescription to null for all other questions.',
    'Return valid JSON matching the schema.',
  ].join('\n\n');
}

const FORMAT_PROMPTS: Record<QuizFormat, string> = {
  mcq: 'Each question has exactly 4 options. The first option must be the correct answer. Include the correct answer in answerText.',
  truefalse: 'Each question is a statement. answerText must be exactly "True" or "False". options should be ["True", "False"].',
  fillblank: 'Each questionText contains a blank shown as "___". answerText is the word/phrase that fills the blank. options should be null.',
  flashcard: 'Each questionText is a concept or term. answerText is the explanation or definition. options should be null.',
  jeopardy: 'Each questionText is an answer/fact. answerText is the question it answers (phrased as "What is...?"). options should contain 3 distractor questions plus the correct one. The correct answerText must be first in options.',
};
