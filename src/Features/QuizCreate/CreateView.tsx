'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import { createTopicAtom, createMaterialAtom } from '@/State/QuizAtoms';
import { generateQuiz, ApiError } from '@/Lib/Api/Client';
import { useAccount } from '@/Lib/Hooks/UseAccount';
import { DEFAULT_QUESTION_COUNT } from '@/Lib/Constants';
import type { Quiz } from '@/Lib/Types';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import ScrollReveal from '@/Features/Shared/ScrollReveal';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import SignInButton from '@/Features/Shared/SignInButton';
import TopicInput from './TopicInput';
import MaterialPaste from './MaterialPaste';
import CountPicker from './CountPicker';
import GeneratingState from './GeneratingState';
import CreatedState from './CreatedState';
import styles from './CreateView.module.css';

export default function CreateView() {
  const { navigate } = useTransitionRouter();
  const { account, loading, signedIn, reload } = useAccount();
  const [topic, setTopic] = useAtom(createTopicAtom);
  const [material, setMaterial] = useAtom(createMaterialAtom);
  const [count, setCount] = useState(DEFAULT_QUESTION_COUNT);
  const [generating, setGenerating] = useState(false);
  const [createdQuiz, setCreatedQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState('');

  const outOfCredits = account !== null && account.credits <= 0;
  const canSubmit = (topic.trim() || material.trim()) && !generating && !outOfCredits;

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
      setCreatedQuiz(quiz);
      reload(); // refresh the credit balance after a successful spend
    } catch (err) {
      if (err instanceof ApiError && err.code === 'out_of_credits') {
        setError("You're out of credits. They refresh at the start of each month.");
        reload();
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Please sign in to generate a quiz.');
      } else {
        setError(err instanceof Error ? err.message : 'Generation failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (createdQuiz) {
    return (
      <AppShell>
        <BlobField />
        <div className={styles.content}>
          <CreatedState
            quiz={createdQuiz}
            onPlay={() => navigate(`/quiz/${createdQuiz.id}/play`)}
            onEdit={() => navigate(`/quiz/${createdQuiz.id}/edit`)}
            onCreateAnother={() => {
              setCreatedQuiz(null);
              setCount(DEFAULT_QUESTION_COUNT);
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BlobField />
      {generating && <GeneratingState count={count} />}
      <div className={styles.content}>
        <span className="neo-bigtext" aria-hidden="true">Make</span>
        <ScrollReveal>
          <span className="neo-sticker" aria-hidden="true">Fresh deck</span>
          <p className={styles.kicker}>Build a fresh round</p>
          <h1 className={styles.heading}>
            Create a <span className={styles.accent}>quiz</span>
          </h1>
          <p className={styles.subhead}>
            Start with a topic, your own study material, or both. We&apos;ll turn it into a
            faster, punchier practice run.
          </p>
        </ScrollReveal>

        {!loading && !signedIn ? (
          <Card color="lavender">
            <p className={styles.kicker}>Sign in to create</p>
            <p>
              Generating a quiz uses AI, so it needs an account. New creators get a free
              monthly bundle of credits to start.
            </p>
            <SignInButton callbackURL="/create" fullWidth />
          </Card>
        ) : (
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <TopicInput value={topic} onChange={setTopic} />
            <MaterialPaste value={material} onChange={setMaterial} />
            <CountPicker value={count} onChange={setCount} />

            {account !== null && (
              <p className={styles.credits} aria-live="polite">
                {account.credits > 0
                  ? `${account.credits} credit${account.credits === 1 ? '' : 's'} remaining`
                  : 'No credits left — they refresh monthly.'}
              </p>
            )}

            {error && <p className={styles.error} role="alert">{error}</p>}

            <Button
              variant="primary"
              fullWidth
              disabled={!canSubmit}
              onClick={handleGenerate}
            >
              Generate quiz
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
