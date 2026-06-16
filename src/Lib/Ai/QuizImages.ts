import { generateCoverImage, generateQuestionImage } from './ImageGen';
import {
  updateQuiz,
  updateQuestionImage,
  updateQuestionOptionImages,
} from '@/Lib/Db/Queries';
import { MAX_IMAGES_PER_GENERATION } from '@/Lib/Constants';

interface ImageQuestion {
  questionText: string;
  imageDescription?: string | null;
  optionImageDescriptions?: (string | null)[] | null;
}

interface ScheduleQuizImagesOpts {
  quizId: string;
  questions: ImageQuestion[];
  // Row ids parallel to `questions` — the DB rows to attach generated images to.
  rowIds: string[];
  // When set, a cover image is generated first (and counts toward the budget).
  coverTopic?: string | null;
}

// Fire-and-forget image generation for a freshly generated quiz, bounded by a
// hard image budget (MAX_IMAGES_PER_GENERATION). The Gemini response can ask for
// a per-question image plus a 4-image option set on every question, which on a
// large quiz fans out to hundreds of Replicate calls per single credit. This
// caps the spend: cover first, then question/option images in order until the
// budget runs out. Remaining questions simply fall back to text — never an error.
export function scheduleQuizImages(opts: ScheduleQuizImagesOpts): void {
  const { quizId, questions, rowIds, coverTopic } = opts;
  let budget = MAX_IMAGES_PER_GENERATION;

  if (coverTopic && budget > 0) {
    budget -= 1;
    generateCoverImage(coverTopic)
      .then((url) => updateQuiz(quizId, { coverImageUrl: url }))
      .catch((err) => warn(quizId, 'cover image', undefined, err));
  }

  questions.forEach((question, index) => {
    const rowId = rowIds[index];
    if (!rowId) return;

    if (question.imageDescription && budget > 0) {
      budget -= 1;
      generateQuestionImage(question.imageDescription)
        .then((url) => updateQuestionImage(rowId, url))
        .catch((err) => warn(quizId, 'question image', question.questionText, err));
    }

    const optionDescriptions = question.optionImageDescriptions ?? [];
    // Option grids need every slot filled (partial sets are discarded), so only
    // start a set when every slot is described AND the whole set fits the budget.
    // This also avoids the old behaviour of spending on partial sets that then
    // get thrown away.
    const wantsOptionSet =
      optionDescriptions.length > 0 && optionDescriptions.every(Boolean);
    if (wantsOptionSet && budget >= optionDescriptions.length) {
      budget -= optionDescriptions.length;
      Promise.all(
        optionDescriptions.map((description) =>
          generateQuestionImage(description as string).catch(() => null),
        ),
      ).then((urls) => {
        if (urls.every((url) => url != null)) {
          updateQuestionOptionImages(rowId, urls as string[]);
        } else {
          const missing = urls.filter((url) => url == null).length;
          console.warn(
            `[quiz/${quizId}] option images for "${truncate(question.questionText, 60)}": ${missing}/${optionDescriptions.length} failed — falling back to text options`,
          );
        }
      });
    }
  });
}

function warn(quizId: string, kind: string, questionText: string | undefined, err: unknown): void {
  const subject = questionText ? ` for "${truncate(questionText, 60)}"` : '';
  const reason = err instanceof Error ? err.message : String(err);
  console.warn(`[quiz/${quizId}] ${kind}${subject} failed: ${reason}`);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}
