'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { createTopicAtom, createMaterialAtom, createFormatAtom } from '@/State/QuizAtoms';
import { generateQuiz, generateImage } from '@/Lib/Api/Client';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import Button from '@/Features/Shared/Button';
import TopicInput from './TopicInput';
import MaterialPaste from './MaterialPaste';
import FormatPicker from './FormatPicker';
import GeneratingState from './GeneratingState';
import styles from './CreateView.module.css';

export default function CreateView() {
  const router = useRouter();
  const [topic, setTopic] = useAtom(createTopicAtom);
  const [material, setMaterial] = useAtom(createMaterialAtom);
  const [format, setFormat] = useAtom(createFormatAtom);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = (topic.trim() || material.trim()) && !generating;

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const quiz = await generateQuiz({
        topic: topic.trim() || undefined,
        material: material.trim() || undefined,
        format,
      });
      const quizTopic = topic.trim() || quiz.title;
      generateImage(quiz.id, quizTopic).catch(() => {});
      setTopic('');
      setMaterial('');
      router.push(`/quiz/${quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <AppShell>
        <BlobField />
        <GeneratingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <ScrollReveal>
          <h1 className={styles.heading}>
            Create a <span className={styles.accent}>quiz</span>
          </h1>
        </ScrollReveal>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <TopicInput value={topic} onChange={setTopic} />
          <MaterialPaste value={material} onChange={setMaterial} />
          <FormatPicker value={format} onChange={setFormat} />

          {error && <p className={styles.error}>{error}</p>}

          <Button
            variant="primary"
            fullWidth
            disabled={!canSubmit}
            onClick={handleGenerate}
          >
            Generate quiz
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
