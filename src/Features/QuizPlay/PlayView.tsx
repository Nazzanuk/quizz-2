'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { HOST_MODE_CONFIG, PLAY_TIMER_SECONDS, PLAY_TIMINGS, STREAK_MILESTONES } from '@/Lib/Constants';
import { fetchHostSession, fetchRun, getResultsSummary, saveResult } from '@/Lib/Api/Client';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import { recordPlayerRun, getPlayerProfile } from '@/Lib/PlayerProfile';
import type {
  HostConfidenceLevel,
  PlayerProfile,
  QuestionAttempt,
  Question,
  QuestionAggregateStats,
  QuizAnswerPhase,
  QuizFormat,
  QuizMilestone,
  SaveResultAttemptInput,
  HostMode,
} from '@/Lib/Types';
import { playSound, primeAudio } from '@/Features/Shared/Sound';
import { haptic } from '@/Features/Shared/Haptic';
import {
  currentIndexAtom,
  userAnswersAtom,
  showResultAtom,
  scoreAtom,
  initPlayAtom,
  resetPlayAtom,
  questionOrderAtom,
  questionFormatsAtom,
  isPlayableQuestion,
  lastRunAtom,
} from '@/State/PlayAtoms';
import { hideTextUiAtom, hostModeAtom, hostVoiceEnabledAtom } from '@/State/SettingsAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import PlayProgress from './PlayProgress';
import ResultsView from './ResultsView';
import FormatRenderer from './FormatRenderer';
import PlayTimer from './PlayTimer';
import HostStage, { type HostCue } from './HostStage';
import { notifyHostAudioInteraction } from './HostVoice';
import {
  averageResponseMs,
  buildAnswerReaction,
  buildQuestionOpener,
  fastestResponseMs,
  getRunInsights,
  shouldPromptConfidence,
} from './HostScript';
import styles from './PlayView.module.css';

interface PlayViewProps {
  quizId: string;
}

interface AnswerCommit {
  correct: boolean;
  phase: QuizAnswerPhase;
  responseMs: number;
  selectedAnswer: string | null;
  timedOut: boolean;
}

const HOST_PERSONA = 'sarcastic_pub_host' as const;

export default function PlayView({ quizId }: PlayViewProps) {
  const { quiz, questions, patchQuestion } = useQuiz(quizId);
  const searchParams = useSearchParams();
  const practiceRunId = searchParams.get('practice');
  const { navigate, replace } = useTransitionRouter();
  const [idx, setIdx] = useAtom(currentIndexAtom);
  const [answers, setAnswers] = useAtom(userAnswersAtom);
  const [showResult, setShowResult] = useAtom(showResultAtom);
  const score = useAtomValue(scoreAtom);
  const questionOrder = useAtomValue(questionOrderAtom);
  const questionFormats = useAtomValue(questionFormatsAtom);
  const initPlay = useSetAtom(initPlayAtom);
  const resetPlay = useSetAtom(resetPlayAtom);
  const setLastRun = useSetAtom(lastRunAtom);
  const hostMode = useAtomValue(hostModeAtom);
  const hostVoiceEnabled = useAtomValue(hostVoiceEnabledAtom);
  const hideTextUi = useAtomValue(hideTextUiAtom);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answerPhase, setAnswerPhase] = useState<QuizAnswerPhase>('idle');
  const [milestone, setMilestone] = useState<QuizMilestone>('none');
  const [hostCue, setHostCue] = useState<HostCue | null>(null);
  const [hostIntro, setHostIntro] = useState('');
  const [questionStats, setQuestionStats] = useState<Record<string, QuestionAggregateStats>>({});
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => getPlayerProfile());
  const [confidenceByQuestion, setConfidenceByQuestion] = useState<Record<string, HostConfidenceLevel | null>>({});
  const [previousWasWrong, setPreviousWasWrong] = useState(false);
  const [recap, setRecap] = useState('');
  const [practiceQuestionIds, setPracticeQuestionIds] = useState<{
    runId: string;
    ids: string[];
  } | null>(null);
  const [runSeed, setRunSeed] = useState(0);
  const uiTimersRef = useRef<number[]>([]);
  const milestoneTimerRef = useRef<number | null>(null);
  const runIdRef = useRef(crypto.randomUUID());
  const runStartedAtRef = useRef(0);
  const attemptsRef = useRef<SaveResultAttemptInput[]>([]);
  const activeRunKeyRef = useRef('');
  const hostSessionKeyRef = useRef('');

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  useEffect(() => {
    getResultsSummary(quizId)
      .then((summary) => setPreviousBest(summary.best))
      .catch(() => {});
  }, [quizId]);

  const clearUiTimers = useCallback(() => {
    uiTimersRef.current.forEach((id) => window.clearTimeout(id));
    uiTimersRef.current = [];
    if (milestoneTimerRef.current) {
      window.clearTimeout(milestoneTimerRef.current);
      milestoneTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearUiTimers, [clearUiTimers]);

  const scheduleUi = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      uiTimersRef.current = uiTimersRef.current.filter((value) => value !== id);
      callback();
    }, delayMs);
    uiTimersRef.current.push(id);
  }, []);

  const showHostCue = useCallback((nextCue: HostCue, freezeSameId = false) => {
    setHostCue((currentCue) => {
      if (!currentCue) return nextCue;
      if (freezeSameId && currentCue.id === nextCue.id) return currentCue;
      if (
        currentCue.id === nextCue.id
        && currentCue.text === nextCue.text
        && currentCue.kind === nextCue.kind
        && currentCue.audioPrefetch === nextCue.audioPrefetch
      ) {
        return currentCue;
      }
      return nextCue;
    });
  }, []);

  const resetRunState = useCallback(() => {
    clearUiTimers();
    setAnswerPhase('idle');
    setMilestone('none');
    setStreak(0);
    setBestStreak(0);
    setHostCue(null);
    setHostIntro('');
    setQuestionStats({});
    setPlayerProfile(getPlayerProfile());
    setConfidenceByQuestion({});
    setPreviousWasWrong(false);
    setRecap('');
    attemptsRef.current = [];
    runIdRef.current = crypto.randomUUID();
    runStartedAtRef.current = Date.now();
    setRunSeed((value) => value + 1);
  }, [clearUiTimers]);

  const startRun = useCallback((items: Question[]) => {
    resetRunState();
    initPlay(items);
  }, [initPlay, resetRunState]);

  useEffect(() => () => {
    resetPlay();
  }, [quizId, resetPlay]);

  useEffect(() => {
    if (!practiceRunId) {
      return;
    }

    let cancelled = false;
    fetchRun(quizId, practiceRunId)
      .then((data) => {
        if (cancelled) return;
        setPracticeQuestionIds({
          runId: practiceRunId,
          ids: data.attempts
            .filter((attempt) => !attempt.correct)
            .map((attempt) => attempt.questionId),
        });
      })
      .catch(() => {
        if (!cancelled) setPracticeQuestionIds({ runId: practiceRunId, ids: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [practiceRunId, quizId]);

  const practiceIds = practiceRunId && practiceQuestionIds?.runId === practiceRunId
    ? practiceQuestionIds.ids
    : null;
  const playableQuestions = useMemo(() => {
    if (!practiceRunId) return questions;
    if (practiceIds === null) return [];
    const ids = new Set(practiceIds);
    return questions.filter((question) => ids.has(question.id));
  }, [practiceIds, practiceRunId, questions]);

  const practiceReady = !practiceRunId || practiceIds !== null;
  const hasPlayableQuestions = playableQuestions.some(isPlayableQuestion);
  const playSessionReady = questionOrder.length > 0
    && idx < questionOrder.length
    && questionOrder.every((questionId) => questionById.has(questionId));
  const runKey = useMemo(
    () => `${quizId}:${practiceRunId ?? 'all'}:${playableQuestions.map((question) => question.id).join('|')}`,
    [playableQuestions, practiceRunId, quizId],
  );

  useEffect(() => {
    if (practiceReady && hasPlayableQuestions && activeRunKeyRef.current !== runKey) {
      activeRunKeyRef.current = runKey;
      const id = window.setTimeout(() => startRun(playableQuestions), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [hasPlayableQuestions, playableQuestions, practiceReady, runKey, startRun]);

  useEffect(() => {
    if (!quiz || questionOrder.length === 0 || runSeed === 0) return;

    // The host session hits the LLM; guard so a re-render or StrictMode
    // remount never regenerates the intro for the same run.
    const sessionKey = `${runIdRef.current}:${hostMode}`;
    if (hostSessionKeyRef.current === sessionKey) return;
    hostSessionKeyRef.current = sessionKey;

    let cancelled = false;
    const profile = getPlayerProfile();

    fetchHostSession(quizId, {
      mode: hostMode,
      hostPersona: HOST_PERSONA,
      profile,
    })
      .then((session) => {
        if (cancelled) return;
        session.questions.forEach((question) => patchQuestion(question.id, question));
        setHostIntro(session.intro);
        setQuestionStats(session.questionStats);
      })
      .catch(() => {
        if (!cancelled) {
          setHostIntro('Right then. Ten questions. No hiding. Let’s see if your brain is awake.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [patchQuestion, questionOrder.length, quiz, quizId, runSeed, hostMode]);

  const currentId = questionOrder[idx];
  const current = currentId ? questionById.get(currentId) : undefined;
  const format = currentId ? (questionFormats.get(currentId) ?? 'mcq') : 'mcq';
  const showConfidencePrompt = current
    ? shouldPromptConfidence({
      question: current,
      index: idx,
      total: questionOrder.length,
      streak,
      previousWasWrong,
    })
    : false;

  useEffect(() => {
    if (!current || showResult || answerPhase !== 'idle') return;

    const opener = buildQuestionOpener({
      question: current,
      index: idx,
      total: questionOrder.length,
      streak,
      mode: hostMode,
      stats: questionStats[current.id],
      profile: playerProfile,
      seed: runIdRef.current,
    });
    const line = [idx === 0 ? hostIntro : '', opener].filter(Boolean).join(' ');

    showHostCue({
      id: `${runIdRef.current}:question:${current.id}:${idx}`,
      text: line,
      kind: idx === 0 && hostIntro ? 'intro' : 'question',
      audioPrefetch: idx === 0 && HOST_MODE_CONFIG[hostMode].enableVoicePrefetch,
    }, true);
  }, [
    answerPhase,
    current,
    hostIntro,
    hostMode,
    idx,
    playerProfile,
    questionOrder.length,
    questionStats,
    showResult,
    showHostCue,
    streak,
  ]);

  useEffect(() => {
    if (!showResult || !recap) return;
    showHostCue({
      id: `${runIdRef.current}:recap`,
      text: recap,
      kind: 'recap',
      audioPrefetch: HOST_MODE_CONFIG[hostMode].enableVoicePrefetch,
    });
  }, [hostMode, recap, showHostCue, showResult]);

  const commitAnswer = useCallback(
    (event: AnswerCommit) => {
      const questionId = questionOrder[idx];
      const question = questionId ? questionById.get(questionId) : undefined;
      if (!questionId || !question) return;

      setAnswerPhase(event.phase);

      const nextAnswers = new Map(answers);
      nextAnswers.set(questionId, event.correct ? '__correct__' : '__wrong__');
      setAnswers(nextAnswers);

      const streakBefore = streak;
      const nextStreak = event.correct ? streak + 1 : 0;
      const nextBestStreak = event.correct ? Math.max(bestStreak, nextStreak) : bestStreak;
      const nextMilestone = event.correct ? (STREAK_MILESTONES[nextStreak] ?? 'none') : 'none';

      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setPreviousWasWrong(!event.correct);

      if (nextMilestone !== 'none') {
        setMilestone(nextMilestone);
        if (milestoneTimerRef.current) window.clearTimeout(milestoneTimerRef.current);
        milestoneTimerRef.current = window.setTimeout(() => {
          setMilestone('none');
          milestoneTimerRef.current = null;
        }, PLAY_TIMINGS.milestonePulseMs);
      } else if (!event.correct) {
        setMilestone('none');
      }

      const confidence = confidenceByQuestion[questionId] ?? null;
      const attempt: SaveResultAttemptInput = {
        questionId,
        orderIndex: idx,
        selectedAnswer: event.selectedAnswer,
        confidence,
        correct: event.correct,
        timedOut: event.timedOut,
        responseMs: event.responseMs,
        streakBefore,
        streakAfter: nextStreak,
        wasFinalQuestion: idx + 1 >= questionOrder.length,
      };
      const nextAttempts = [...attemptsRef.current, attempt];
      attemptsRef.current = nextAttempts;

      const reaction = buildAnswerReaction({
        question,
        attempt,
        mode: hostMode,
        stats: questionStats[questionId],
        previousWasWrong,
        seed: runIdRef.current,
      });

      showHostCue({
        id: `${runIdRef.current}:answer:${questionId}:${idx}`,
        text: reaction,
        kind: 'answer',
      });

      const beatDelayMs = Math.max(
        event.timedOut ? PLAY_TIMINGS.timeoutRevealHoldMs : PLAY_TIMINGS.answerRevealHoldMs,
        HOST_MODE_CONFIG[hostMode].answerBeatMs,
      );

      if (idx + 1 >= questionOrder.length) {
        const correctCount = [...nextAnswers.values()].filter((value) => value === '__correct__').length;
        const perQuestion: Record<string, string> = {};
        nextAnswers.forEach((value, key) => {
          perQuestion[key] = value;
        });
        const pct = nextAnswers.size > 0 ? Math.round((correctCount / nextAnswers.size) * 100) : 0;
        const isNewBest = previousBest !== null && pct > previousBest;
        const runInsights = getRunInsights({ questions, attempts: nextAttempts });
        const fallbackRecap = buildFallbackRecap({
          correct: correctCount,
          total: nextAnswers.size,
          bestStreak: nextBestStreak,
          fastestMs: fastestResponseMs(nextAttempts),
          averageMs: averageResponseMs(nextAttempts),
          strengths: runInsights.strengths,
          weaknesses: runInsights.weaknesses,
        });
        setRecap(fallbackRecap);

        scheduleUi(async () => {
          const elapsedMs = Date.now() - runStartedAtRef.current;
          const runId = runIdRef.current;
          const createdAt = new Date().toISOString();
          const snapshotAttempts = toQuestionAttempts({
            attempts: nextAttempts,
            runId,
            quizId,
            hostMode,
            createdAt,
          });
          const questionByAttemptId = new Map(questions.map((item) => [item.id, item]));
          const snapshotQuestions = nextAttempts
            .map((attempt) => questionByAttemptId.get(attempt.questionId))
            .filter((item) => item != null);
          const updatedProfile = recordPlayerRun(getPlayerProfile(), {
            quizId,
            questions,
            correct: correctCount,
            total: nextAnswers.size,
            bestStreak: nextBestStreak,
            recap: fallbackRecap,
            attempts: nextAttempts,
          });
          setPlayerProfile(updatedProfile);

          try {
            await saveResult(quizId, {
              runId,
              mode: hostMode,
              hostPersona: HOST_PERSONA,
              correct: correctCount,
              total: nextAnswers.size,
              bestStreak: nextBestStreak,
              elapsedMs,
              recap: fallbackRecap,
              perQuestion,
              attempts: nextAttempts,
            });

            setLastRun({
              runId,
              quizId,
              mode: hostMode,
              hostPersona: HOST_PERSONA,
              correct: correctCount,
              total: nextAnswers.size,
              bestStreak: nextBestStreak,
              wrongQuestionIds: nextAttempts
                .filter((attempt) => !attempt.correct)
                .map((attempt) => attempt.questionId),
              recap: fallbackRecap,
              previousBest,
              elapsedMs,
              createdAt,
              attempts: snapshotAttempts,
              questions: snapshotQuestions,
            });

            setAnswerPhase('idle');
            playSound(isNewBest ? 'newBest' : 'complete');
            haptic('success');
            replace(`/quiz/${quizId}/results/${runId}`);
          } catch {
            setAnswerPhase('idle');
            playSound(isNewBest ? 'newBest' : 'complete');
            haptic('success');
            setShowResult(true);
          }
        }, beatDelayMs);
      } else {
        scheduleUi(() => {
          setAnswerPhase('idle');
          setIdx(idx + 1);
        }, beatDelayMs);
      }
    },
    [
      answers,
      bestStreak,
      confidenceByQuestion,
      hostMode,
      idx,
      previousBest,
      previousWasWrong,
      questionById,
      questionOrder,
      questionStats,
      questions,
      quizId,
      replace,
      scheduleUi,
      showHostCue,
      setAnswers,
      setIdx,
      setLastRun,
      setShowResult,
      streak,
    ],
  );

  if (!quiz || !practiceReady || (hasPlayableQuestions && !playSessionReady)) {
    return (
      <AppShell variant="focused">
        <div className={styles.center}><LoadingSpinner /></div>
      </AppShell>
    );
  }

  if (showResult) {
    const wrongQuestions = questions.filter((question) => answers.get(question.id) === '__wrong__');
    return (
      <AppShell variant="focused">
        <BlobField />
      <div className={styles.content}>
        <HostStage
          cue={hostCue}
          mode={hostMode}
          hostPersona={HOST_PERSONA}
          voiceEnabled={hostVoiceEnabled}
        />
          <ResultsView
            correct={score.correct}
            total={score.total}
            previousBest={previousBest}
            bestStreak={bestStreak}
            wrongCount={wrongQuestions.length}
            recap={recap}
            onRetry={() => startRun(questions)}
            onPracticeWeak={wrongQuestions.length > 0
              ? () => startRun(wrongQuestions)
              : undefined}
            onBack={() => navigate(`/quiz/${quizId}`)}
          />
        </div>
      </AppShell>
    );
  }

  if (questions.length > 0 && !hasPlayableQuestions) {
    return (
      <AppShell variant="focused">
        <BlobField />
        <div className={styles.content}>
          <div className={styles.retiredState}>
            <h2 className={styles.retiredTitle}>
              {practiceRunId ? 'No weak spots in that run.' : 'This quiz uses a retired question mode.'}
            </h2>
            <p className={styles.retiredBody}>
              {practiceRunId
                ? 'Head back to the quiz or start a fresh full run.'
                : 'Flashcards are no longer playable here. Add fresh questions to bring this quiz back with the new formats.'}
            </p>
            <Link href={`/quiz/${quizId}`} className={styles.retiredLink}>
              Back to quiz
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!current) {
    return (
      <AppShell variant="focused">
        <div className={styles.center}><LoadingSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="focused">
      <BlobField />
      <div className={`${styles.content} ${styles.liveContent} ${hideTextUi ? styles.liveContentMinimal : ''}`}>
        <HostStage
          cue={hostCue}
          mode={hostMode}
          hostPersona={HOST_PERSONA}
          voiceEnabled={hostVoiceEnabled}
          hideTextUi={hideTextUi}
          category={current.category}
          difficulty={current.difficulty}
          showConfidencePrompt={!hideTextUi && showConfidencePrompt}
          confidence={confidenceByQuestion[current.id] ?? null}
          onConfidenceChange={(value) =>
            setConfidenceByQuestion((state) => ({ ...state, [current.id]: value }))}
        />
        <PlayProgress
          current={idx}
          total={questionOrder.length}
          correct={score.correct}
          streak={streak}
          milestone={milestone}
          answerPhase={answerPhase}
          hideTextUi={hideTextUi}
        />
        <ActiveQuestion
          key={`${current.id}-${format}`}
          current={current}
          questions={questions}
          format={format}
          answerPhase={answerPhase}
          hideTextUi={hideTextUi}
          setAnswerPhase={setAnswerPhase}
          onAnswer={commitAnswer}
        />
      </div>
    </AppShell>
  );
}

interface ActiveQuestionProps {
  current: Question;
  questions: Question[];
  format: QuizFormat;
  answerPhase: QuizAnswerPhase;
  hideTextUi: boolean;
  setAnswerPhase: (phase: QuizAnswerPhase) => void;
  onAnswer: (event: AnswerCommit) => void;
}

function ActiveQuestion({
  current,
  questions,
  format,
  answerPhase,
  hideTextUi,
  setAnswerPhase,
  onAnswer,
}: ActiveQuestionProps) {
  const [interactionLocked, setInteractionLocked] = useState(false);
  const [pressedValue, setPressedValue] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const transitionIdsRef = useRef<number[]>([]);
  const questionStartedAtRef = useRef(0);
  const correctValue = format === 'jeopardy' ? current.questionText : current.answerText;

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    return () => {
      transitionIdsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      transitionIdsRef.current = transitionIdsRef.current.filter((value) => value !== id);
      callback();
    }, delayMs);
    transitionIdsRef.current.push(id);
  }, []);

  const handleOptionPress = useCallback((value: string) => {
    if (interactionLocked || answerPhase !== 'idle') return;
    primeAudio();
    notifyHostAudioInteraction();
    setPressedValue(value);
    setAnswerPhase('pressed');
  }, [answerPhase, interactionLocked, setAnswerPhase]);

  const handleOptionCancelPress = useCallback((value: string) => {
    if (interactionLocked) return;
    if (answerPhase !== 'pressed' || pressedValue !== value) return;
    setPressedValue(null);
    setAnswerPhase('idle');
  }, [answerPhase, interactionLocked, pressedValue, setAnswerPhase]);

  const handleOptionSelect = useCallback((value: string) => {
    if (interactionLocked) return;

    setInteractionLocked(true);
    setPressedValue(null);
    setSelectedValue(value);
    setAnswerPhase('selected');
    notifyHostAudioInteraction();

    const correct = value === correctValue;
    const responseMs = Date.now() - questionStartedAtRef.current;
    schedule(() => {
      const revealPhase: QuizAnswerPhase = correct
        ? 'revealed-correct'
        : 'revealed-wrong';
      setAnswerPhase(revealPhase);
      playSound(correct ? 'correct' : 'wrong');
      haptic(correct ? 'correct' : 'wrong');
      onAnswer({
        correct,
        phase: revealPhase,
        responseMs,
        selectedAnswer: value,
        timedOut: false,
      });
    }, PLAY_TIMINGS.answerRevealDelayMs);
  }, [correctValue, interactionLocked, onAnswer, schedule, setAnswerPhase]);

  const handleTimeout = useCallback(() => {
    if (interactionLocked) return;
    setInteractionLocked(true);
    setPressedValue(null);
    playSound('wrong');
    haptic('wrong');
    setAnswerPhase('timed-out');
    onAnswer({
      correct: false,
      phase: 'timed-out',
      responseMs: PLAY_TIMER_SECONDS[format] * 1000,
      selectedAnswer: null,
      timedOut: true,
    });
  }, [format, interactionLocked, onAnswer, setAnswerPhase]);

  return (
    <>
      <PlayTimer
        seconds={PLAY_TIMER_SECONDS[format]}
        phase={answerPhase}
        paused={interactionLocked}
        hideTextUi={hideTextUi}
        onExpire={handleTimeout}
      />
      <div className={styles.questionWrap}>
        <FormatRenderer
          question={current}
          allQuestions={questions}
          format={format}
          answerPhase={answerPhase}
          pressedValue={pressedValue}
          selectedValue={selectedValue}
          locked={interactionLocked}
          hideTextUi={hideTextUi}
          onOptionPress={handleOptionPress}
          onOptionCancelPress={handleOptionCancelPress}
          onOptionSelect={handleOptionSelect}
        />
      </div>
    </>
  );
}

function toQuestionAttempts(args: {
  attempts: SaveResultAttemptInput[];
  runId: string;
  quizId: string;
  hostMode: HostMode;
  createdAt: string;
}): QuestionAttempt[] {
  return args.attempts.map((attempt) => ({
    id: `${args.runId}:${attempt.questionId}:${attempt.orderIndex}`,
    runId: args.runId,
    quizId: args.quizId,
    questionId: attempt.questionId,
    orderIndex: attempt.orderIndex,
    selectedAnswer: attempt.selectedAnswer,
    confidence: attempt.confidence,
    correct: attempt.correct,
    timedOut: attempt.timedOut,
    responseMs: attempt.responseMs,
    streakBefore: attempt.streakBefore,
    streakAfter: attempt.streakAfter,
    wasFinalQuestion: attempt.wasFinalQuestion,
    hostMode: args.hostMode,
    createdAt: args.createdAt,
  }));
}

function buildFallbackRecap(args: {
  correct: number;
  total: number;
  bestStreak: number;
  fastestMs: number | null;
  averageMs: number | null;
  strengths: string[];
  weaknesses: string[];
}): string {
  const parts = [
    `${args.correct} out of ${args.total}.`,
    args.bestStreak >= 3
      ? `Strong streak of ${args.bestStreak} before things got theatrical.`
      : 'No huge streaks, but you kept the wheels attached.',
    args.fastestMs !== null
      ? `Fastest answer ${formatMs(args.fastestMs)}.`
      : '',
    args.strengths.length > 0
      ? `You looked sharp on ${args.strengths.join(' and ')}.`
      : '',
    args.weaknesses.length > 0
      ? `${args.weaknesses.join(' and ')} still need a quiet word.`
      : '',
    args.averageMs !== null && args.averageMs <= 2200
      ? 'The pace suggested confidence, recklessness, or both.'
      : '',
  ].filter(Boolean);

  return parts.slice(0, 3).join(' ');
}

function formatMs(value: number): string {
  return `${(value / 1000).toFixed(1)}s`;
}
