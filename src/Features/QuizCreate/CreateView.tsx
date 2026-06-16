'use client';

import { useEffect, useState } from 'react';
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
  const hasInput = Boolean(topic.trim() || material.trim());
  const canSubmit = hasInput && !generating && !outOfCredits;
  // Surface why the button is disabled when the only thing missing is input
  // (credits/sign-in already have their own messaging above the button).
  const needsInput = !hasInput && !outOfCredits;

  // Warn before leaving (tab close / refresh) while a quiz is generating — the
  // request is blocking and the spent credit isn't refunded on navigation.
  useEffect(() => {
    if (!generating) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [generating]);

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

        {loading ? null : !signedIn ? (
          <Card color="lavender">
            <p className={styles.kicker}>Sign in to create</p>
            <p>
              Generating a quiz uses AI, so it needs an account. New creators get a free
              monthly bundle of credits to start.
            </p>
            <SignInButton callbackURL="/create" fullWidth />
          </Card>
        ) : (
          <form
            className={styles.form}
            onSubmit={(e) => {
              // Drive generation from submit so the mobile keyboard's "Go" key
              // works, not just a tap on the button.
              e.preventDefault();
              if (canSubmit) handleGenerate();
            }}
          >
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

            {needsInput && (
              <p className={styles.credits}>Add a topic or paste material to generate.</p>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={!canSubmit}
            >
              Generate quiz
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
