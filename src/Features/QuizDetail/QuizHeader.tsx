'use client';

import { useState, useEffect } from 'react';
import type { Quiz } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import SafeImage from '@/Features/Shared/SafeImage';
import styles from './QuizHeader.module.css';

interface QuizHeaderProps {
  quiz: Quiz;
  editing: boolean;
  onSave: (data: { title: string; description: string | null }) => Promise<void>;
}

export default function QuizHeader({ quiz, editing, onSave }: QuizHeaderProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [title, setTitle] = useState(quiz.title);
  const [desc, setDesc] = useState(quiz.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(quiz.title);
    setDesc(quiz.description ?? '');
  }, [quiz.id]);

  const handleBlur = async () => {
    const t = title.trim();
    if (!t) return;
    if (t === quiz.title && desc.trim() === (quiz.description ?? '')) return;
    setSaving(true);
    await onSave({ title: t, description: desc.trim() || null });
    setSaving(false);
  };

  return (
    <header className={styles.header}>
      {quiz.coverImageUrl && (
        <SafeImage
          src={quiz.coverImageUrl}
          alt=""
          className={`${styles.cover} ${imgLoaded ? styles.coverLoaded : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
      )}

      {editing ? (
        <input
          className={styles.titleInput}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleBlur}
          placeholder="Quiz title"
        />
      ) : (
        <h1 className={styles.title}>{quiz.title}</h1>
      )}

      {editing ? (
        <textarea
          className={styles.descInput}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onBlur={handleBlur}
          placeholder="Add a description…"
          rows={2}
        />
      ) : (
        quiz.description && <p className={styles.desc}>{quiz.description}</p>
      )}

      <p className={styles.meta}>
        {quiz.questionCount} questions · {formatDate(quiz.createdAt)}
        {saving && <span className={styles.saving}> · saving…</span>}
      </p>
    </header>
  );
}
