'use client';

import { useState } from 'react';
import type { Question } from '@/Lib/Types';
import { updateQuestion } from '@/Lib/Api/Client';
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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const t = text.trim();
    const a = answer.trim();
    if (!t || !a) return;
    if (t === question.questionText && a === question.answerText) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    const options = question.options ? [a, ...question.options.slice(1)] : undefined;
    await updateQuestion(quizId, question.id, {
      questionText: t,
      answerText: a,
      ...(options ? { options } : {}),
    });
    onUpdate(question.id, {
      questionText: t,
      answerText: a,
      ...(options ? { options } : {}),
    });
    setSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(question.questionText);
    setAnswer(question.answerText);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setText(question.questionText);
    setAnswer(question.answerText);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <Card color={color} className={styles.card}>
        <p className={styles.number}>Q{index + 1}</p>
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
        <div className={styles.editActions}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !text.trim() || !answer.trim()}
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
