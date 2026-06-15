'use client';

import { useState } from 'react';
import type { Question } from '@/Lib/Types';
import { regenerateQuestionImage, updateQuestion } from '@/Lib/Api/Client';
import Card from '@/Features/Shared/Card';
import SafeImage from '@/Features/Shared/SafeImage';
import styles from './QuestionItem.module.css';

interface QuestionItemProps {
  question: Question;
  index: number;
  quizId: string;
  editing: boolean;
  imagesPending: boolean;
  onUpdate: (questionId: string, data: Partial<Question>) => void;
  onDelete?: (questionId: string) => void;
}

// The wrong-answer options for a question = its stored options minus the
// correct answer, padded to three editable slots.
function deriveDistractors(question: Question): string[] {
  const others = (question.options ?? []).filter((o) => o !== question.answerText);
  return [0, 1, 2].map((i) => others[i] ?? '');
}

export default function QuestionItem({
  question,
  index,
  quizId,
  editing,
  imagesPending,
  onUpdate,
  onDelete,
}: QuestionItemProps) {
  const color = index % 2 === 0 ? 'sage' : 'lavender';
  const hasOptions = Array.isArray(question.options) && question.options.length > 0;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(question.questionText);
  const [answer, setAnswer] = useState(question.answerText);
  const [distractors, setDistractors] = useState<string[]>(() => deriveDistractors(question));
  const [imagePrompt, setImagePrompt] = useState(question.imagePrompt ?? question.questionText);
  const [saving, setSaving] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const distractorsIncomplete = hasOptions && distractors.some((d) => !d.trim());

  const handleSave = async () => {
    const t = text.trim();
    const a = answer.trim();
    const prompt = imagePrompt.trim();
    if (!t || !a || distractorsIncomplete) return;

    setSaving(true);
    setImageError('');
    const options = hasOptions ? [a, ...distractors.map((d) => d.trim())] : undefined;
    const patch = {
      questionText: t,
      answerText: a,
      imagePrompt: prompt || null,
      ...(options ? { options } : {}),
    };
    await updateQuestion(quizId, question.id, patch);
    onUpdate(question.id, patch);
    setSaving(false);
    setIsEditing(false);
  };

  const setDistractor = (i: number, value: string) => {
    setDistractors((prev) => prev.map((d, idx) => (idx === i ? value : d)));
  };

  const resetFields = () => {
    setText(question.questionText);
    setAnswer(question.answerText);
    setDistractors(deriveDistractors(question));
    setImagePrompt(question.imagePrompt ?? question.questionText);
    setImageError('');
  };

  const handleCancel = () => {
    resetFields();
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    resetFields();
    setIsEditing(true);
  };

  const handleRegenerateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt) {
      setImageError('Add an image prompt first.');
      return;
    }

    setRegeneratingImage(true);
    setImageError('');
    try {
      const updated = await regenerateQuestionImage(quizId, question.id, prompt);
      onUpdate(question.id, updated);
      setImagePrompt(updated.imagePrompt ?? prompt);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image regeneration failed');
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!question.imageUrl) return;

    setRemovingImage(true);
    setImageError('');
    try {
      const updated = await updateQuestion(quizId, question.id, { imageUrl: null });
      onUpdate(question.id, updated);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Removing image failed');
    } finally {
      setRemovingImage(false);
    }
  };

  if (isEditing) {
    return (
      <Card color={color} className={styles.card}>
        <p className={styles.number}>Q{index + 1}</p>
        {(question.imageUrl || regeneratingImage || removingImage) && (
          <div className={styles.editImageWrap}>
            {question.imageUrl && !removingImage ? (
              <SafeImage src={question.imageUrl} alt="" className={styles.questionImg} />
            ) : (
              <div className={`${styles.questionImg} ${styles.skeleton}`} />
            )}
          </div>
        )}
        <textarea
          className={styles.editField}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Question"
          rows={2}
          autoFocus
        />
        <input
          className={styles.editField}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Correct answer"
        />
        {hasOptions && (
          <>
            <label className={styles.editLabel}>Other options</label>
            {distractors.map((d, i) => (
              <input
                key={i}
                className={styles.editField}
                value={d}
                onChange={e => setDistractor(i, e.target.value)}
                placeholder={`Option ${i + 2}`}
              />
            ))}
          </>
        )}
        <label className={styles.editLabel} htmlFor={`image-prompt-${question.id}`}>
          Image prompt
        </label>
        <textarea
          id={`image-prompt-${question.id}`}
          className={styles.editField}
          value={imagePrompt}
          onChange={e => setImagePrompt(e.target.value)}
          placeholder="Describe the image you want generated for this question"
          rows={3}
        />
        <div className={styles.imageActions}>
          <div className={styles.imageActionRow}>
            <button
              className={styles.imageBtn}
              onClick={handleRegenerateImage}
              disabled={regeneratingImage || removingImage || !imagePrompt.trim()}
              type="button"
            >
              {regeneratingImage ? 'Regenerating image…' : question.imageUrl ? 'Regenerate image' : 'Generate image'}
            </button>
            {question.imageUrl && (
              <button
                className={styles.imageRemoveBtn}
                onClick={handleRemoveImage}
                disabled={regeneratingImage || removingImage}
                type="button"
              >
                {removingImage ? 'Removing image…' : 'Remove image'}
              </button>
            )}
          </div>
          {imageError && <p className={styles.imageError}>{imageError}</p>}
        </div>
        <div className={styles.editActions}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || regeneratingImage || removingImage || !text.trim() || !answer.trim() || distractorsIncomplete}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          {onDelete && (
            <button
              className={styles.deleteBtn}
              type="button"
              onClick={() => onDelete(question.id)}
            >
              Delete
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card color={color} className={styles.card}>
      {question.imageUrl ? (
        <SafeImage src={question.imageUrl} alt="" className={styles.questionImg} />
      ) : imagesPending && question.imagePrompt ? (
        <div className={`${styles.questionImg} ${styles.skeleton}`} />
      ) : null}
      <div className={styles.cardTop}>
        <p className={styles.number}>Q{index + 1}</p>
        {editing && (
          <button
            className={styles.editBtn}
            onClick={handleStartEdit}
            aria-label="Edit question"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
        )}
      </div>
      <p className={styles.text}>{question.questionText}</p>
      <p className={styles.answer}>{question.answerText}</p>
      {question.optionImages ? (
        <div className={styles.optionThumbs}>
          {question.optionImages.map((url, i) =>
            url ? (
              <SafeImage
                key={i}
                src={url}
                alt={question.options?.[i] ?? ''}
                className={styles.optionThumb}
                title={question.options?.[i]}
              />
            ) : null,
          )}
        </div>
      ) : null}
    </Card>
  );
}
