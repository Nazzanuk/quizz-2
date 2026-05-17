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
}

export default function QuestionItem({
  question,
  index,
  quizId,
  editing,
  imagesPending,
  onUpdate,
}: QuestionItemProps) {
  const color = index % 2 === 0 ? 'sage' : 'lavender';
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(question.questionText);
  const [answer, setAnswer] = useState(question.answerText);
  const [imagePrompt, setImagePrompt] = useState(question.imagePrompt ?? question.questionText);
  const [saving, setSaving] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const handleSave = async () => {
    const t = text.trim();
    const a = answer.trim();
    const prompt = imagePrompt.trim();
    if (!t || !a) return;
    if (
      t === question.questionText
      && a === question.answerText
      && prompt === (question.imagePrompt ?? question.questionText)
    ) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setImageError('');
    const options = question.options ? [a, ...question.options.slice(1)] : undefined;
    await updateQuestion(quizId, question.id, {
      questionText: t,
      answerText: a,
      imagePrompt: prompt || null,
      ...(options ? { options } : {}),
    });
    onUpdate(question.id, {
      questionText: t,
      answerText: a,
      imagePrompt: prompt || null,
      ...(options ? { options } : {}),
    });
    setSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(question.questionText);
    setAnswer(question.answerText);
    setImagePrompt(question.imagePrompt ?? question.questionText);
    setImageError('');
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setText(question.questionText);
    setAnswer(question.answerText);
    setImagePrompt(question.imagePrompt ?? question.questionText);
    setImageError('');
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

  if (isEditing) {
    return (
      <Card color={color} className={styles.card}>
        <p className={styles.number}>Q{index + 1}</p>
        {(question.imageUrl || regeneratingImage) && (
          <div className={styles.editImageWrap}>
            {question.imageUrl ? (
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
          placeholder="Answer"
        />
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
          <button
            className={styles.imageBtn}
            onClick={handleRegenerateImage}
            disabled={regeneratingImage || !imagePrompt.trim()}
            type="button"
          >
            {regeneratingImage ? 'Regenerating image…' : question.imageUrl ? 'Regenerate image' : 'Generate image'}
          </button>
          {imageError && <p className={styles.imageError}>{imageError}</p>}
        </div>
        <div className={styles.editActions}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || regeneratingImage || !text.trim() || !answer.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card color={color} className={styles.card}>
      {question.imageUrl ? (
        <SafeImage src={question.imageUrl} alt="" className={styles.questionImg} />
      ) : imagesPending ? (
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
      ) : imagesPending ? (
        <div className={styles.optionThumbs}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${styles.optionThumb} ${styles.skeleton}`} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
