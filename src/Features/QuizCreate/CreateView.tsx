'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import { createTopicAtom, createMaterialAtom } from '@/State/QuizAtoms';
import { generateQuiz } from '@/Lib/Api/Client';
import { DEFAULT_QUESTION_COUNT } from '@/Lib/Constants';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import Button from '@/Features/Shared/Button';
import TopicInput from './TopicInput';
import MaterialPaste from './MaterialPaste';
import CountPicker from './CountPicker';
import GeneratingState from './GeneratingState';
import styles from './CreateView.module.css';

export default function CreateView() {
  const { navigate } = useTransitionRouter();
  const [topic, setTopic] = useAtom(createTopicAtom);
  const [material, setMaterial] = useAtom(createMaterialAtom);
  const [count, setCount] = useState(DEFAULT_QUESTION_COUNT);
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
        count,
      });
      setTopic('');
      setMaterial('');
      navigate(`/quiz/${quiz.id}`);
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
          <CountPicker value={count} onChange={setCount} />

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
