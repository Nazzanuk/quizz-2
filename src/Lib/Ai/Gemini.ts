import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from '@google/generative-ai';
import { normalizeQuizFormat, type QuizFormat } from '../Types';

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
        },
        required: ['format', 'questionText', 'answerText', 'options'],
      },
    },
  },
  required: ['title', 'description', 'questions'],
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
  }[];
}

export async function generateQuiz(opts: {
  topic?: string;
  material?: string;
  count: number;
  existingQuestions?: string[];
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
  return parseGeneratedQuiz(text);
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
    FORMAT_INSTRUCTIONS,
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
  'imageDescription: a single concise visual description (or null). Use when a recognizable subject genuinely helps.',
  '',
  'optionImageDescriptions: only for mcq questions where the four answer options are visually distinct subjects (flags, landmarks, species, artworks, anatomical parts, etc). Provide an array of 4 descriptions in the same order as options. Each must follow the visual-attribute rules above. Each image must be unambiguous and isolated on a plain background so it can stand alone in a 2×2 grid. Set to null for fill_blank and odd_one_out questions, and set to null when text options suffice.',
].join('\n');

const FORMAT_INSTRUCTIONS = [
  'Use a mix of these question formats: mcq, fill_blank, and odd_one_out.',
  'Distribute them as evenly as possible across the quiz. When the count is 3 or more, include at least one fill_blank or odd_one_out question.',
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
    })),
  };
}

function normalizeGeneratedQuestionFormat(value: string): GeneratedQuestionFormat {
  const format = normalizeQuizFormat(value);
  if (format === 'fill_blank' || format === 'odd_one_out') return format;
  return 'mcq';
}
