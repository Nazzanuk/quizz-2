'use client';

import { useState } from 'react';
import type { Quiz } from '@/Lib/Types';
import { formatDate } from '@/Lib/Utils';
import SafeImage from '@/Features/Shared/SafeImage';
import styles from './QuizHeader.module.css';

interface QuizHeaderProps {
  quiz: Quiz;
  editing: boolean;
  imagesPending: boolean;
  onSave: (data: { title: string; description: string | null }) => Promise<void>;
}

export default function QuizHeader({ quiz, editing, imagesPending, onSave }: QuizHeaderProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <header className={styles.header}>
      {quiz.coverImageUrl ? (
        <SafeImage
          src={quiz.coverImageUrl}
          alt=""
          className={`${styles.cover} ${imgLoaded ? styles.coverLoaded : ''}`}
          onLoad={() => setImgLoaded(true)}
        />
      ) : imagesPending ? (
        <div className={`${styles.cover} ${styles.coverSkeleton}`} />
      ) : null}

      {editing ? (
        <EditableHeaderFields key={quiz.id} quiz={quiz} onSave={onSave} />
      ) : (
        <>
          <h1 className={styles.title}>{quiz.title}</h1>
          {quiz.description && (
            <p className={styles.desc}>{quiz.description}</p>
          )}
        </>
      )}

      <div className={styles.metaRow}>
        <p className={styles.meta}>
          {quiz.questionCount} questions · {formatDate(quiz.createdAt)}
        </p>
        {imagesPending && (
          <span className={styles.statusPill}>Finishing images</span>
        )}
      </div>
    </header>
  );
}

interface EditableHeaderFieldsProps {
  quiz: Quiz;
  onSave: (data: { title: string; description: string | null }) => Promise<void>;
}

function EditableHeaderFields({ quiz, onSave }: EditableHeaderFieldsProps) {
  const [title, setTitle] = useState(quiz.title);
  const [desc, setDesc] = useState(quiz.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleBlur = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = desc.trim();

    if (!trimmedTitle) return;
    if (trimmedTitle === quiz.title && trimmedDesc === (quiz.description ?? '')) return;

    setSaving(true);
    await onSave({ title: trimmedTitle, description: trimmedDesc || null });
    setSaving(false);
  };

  return (
    <>
      <input
        className={styles.titleInput}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={handleBlur}
        placeholder="Quiz title"
      />

      <textarea
        className={styles.descInput}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add a description…"
        rows={2}
      />

      {saving && (
        <p className={styles.meta}>
          <span className={styles.saving}>saving…</span>
        </p>
      )}
    </>
  );
}
