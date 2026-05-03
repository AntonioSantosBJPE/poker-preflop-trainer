import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Act } from '@/components/training/TrainingActionButtons';
import { LeaveTrainingDialog } from '@/components/training/LeaveTrainingDialog';
import { TrainingActionButtons } from '@/components/training/TrainingActionButtons';
import { TrainingFeedbackPanel } from '@/components/training/TrainingFeedbackPanel';
import { TrainingSessionHeader } from '@/components/training/TrainingSessionHeader';
import { PlayingCard } from '@/components/PlayingCard';
import type { FeedbackMode } from '../env';

type Card = { rank: string; suit: string };

export function TrainingSessionPage(): ReactElement {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { totalHands: number; timerSeconds: number; feedbackMode: FeedbackMode };
  };

  const [totalHands, setTotalHands] = useState(location.state?.totalHands ?? 10);
  const [timerSeconds, setTimerSeconds] = useState(location.state?.timerSeconds ?? 0);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(
    location.state?.feedbackMode ?? 'IMMEDIATE',
  );
  const [index, setIndex] = useState(0);

  const [hand, setHand] = useState<{
    situationId: number;
    card1: Card;
    card2: Card;
    actions: Act[];
  } | null>(null);
  const [situationName, setSituationName] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; ms: number } | null>(null);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [paused, setPaused] = useState(false);

  const deadlineRef = useRef<number | null>(null);
  const pausedRemainingMsRef = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  const answeredRef = useRef(false);
  const timerSecondsRef = useRef(timerSeconds);
  const feedbackRef = useRef(feedback);
  const handRef = useRef(hand);
  const showAbandonDialogRef = useRef(showAbandonDialog);
  const pausedRef = useRef(paused);

  useEffect(() => {
    timerSecondsRef.current = timerSeconds;
  }, [timerSeconds]);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    handRef.current = hand;
  }, [hand]);

  useEffect(() => {
    showAbandonDialogRef.current = showAbandonDialog;
  }, [showAbandonDialog]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const dealNextHand = useCallback(async () => {
    answeredRef.current = false;
    const sid = Number(sessionId);
    const h = (await window.api.training.dealHand(sid)) as {
      situationId: number;
      card1: Card;
      card2: Card;
      actions: Act[];
    };
    setHand(h);
    const detail = (await window.api.situations.get(h.situationId)) as { name: string };
    setSituationName(detail.name);
    setFeedback(null);
    feedbackRef.current = null;
    deadlineRef.current =
      timerSecondsRef.current > 0 ? Date.now() + timerSecondsRef.current * 1000 : null;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const meta = await window.api.training.getSession(Number(sessionId));
        if (cancelled) return;
        if (meta.finished) {
          navigate(`/training/${sessionId}/result`, { replace: true });
          return;
        }
        setTotalHands(meta.totalHands);
        setTimerSeconds(meta.timerSeconds);
        timerSecondsRef.current = meta.timerSeconds;
        setFeedbackMode(meta.feedbackMode as FeedbackMode);
        setIndex(meta.handsPlayed);
        await dealNextHand();
      } catch {
        if (!cancelled) {
          navigate('/training', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, dealNextHand]);

  useEffect(() => {
    if (!hand || showAbandonDialog || paused) return;
    const t = setInterval(() => setTick((x) => x + 1), 200);
    return () => clearInterval(t);
  }, [hand, showAbandonDialog, paused]);

  const remainingSec =
    timerSecondsRef.current && deadlineRef.current
      ? Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      : null;

  async function finishSession(): Promise<void> {
    await window.api.training.finishSession(Number(sessionId));
    navigate(`/training/${sessionId}/result`);
  }

  async function proceedAfterHand(): Promise<void> {
    const next = index + 1;
    if (next >= totalHands) {
      await finishSession();
      return;
    }
    setIndex(next);
    await dealNextHand();
  }

  async function submit(actionId: number | null, timedOut: boolean): Promise<void> {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const res = await window.api.training.submitAnswer({
      sessionId: Number(sessionId),
      chosenActionId: actionId,
      timedOut,
    });
    if (feedbackMode === 'IMMEDIATE') {
      setFeedback({ ok: res.isCorrect, ms: res.responseMs });
    } else {
      await proceedAfterHand();
    }
  }

  useEffect(() => {
    if (
      pausedRef.current ||
      !timerSecondsRef.current ||
      !handRef.current ||
      feedbackRef.current ||
      answeredRef.current ||
      showAbandonDialogRef.current
    )
      return;
    if (remainingSec === 0) {
      void submit(null, true);
    }
  }, [tick]);

  function handlePause(): void {
    if (deadlineRef.current === null) return;
    pausedRemainingMsRef.current = Math.max(0, deadlineRef.current - Date.now());
    deadlineRef.current = null;
    setPaused(true);
  }

  function handleContinue(): void {
    if (pausedRemainingMsRef.current === null) return;
    deadlineRef.current = Date.now() + pausedRemainingMsRef.current;
    pausedRemainingMsRef.current = null;
    setPaused(false);
  }

  function openAbandonDialog(): void {
    if (!paused && deadlineRef.current !== null) {
      pausedRemainingMsRef.current = Math.max(0, deadlineRef.current - Date.now());
      deadlineRef.current = null;
    }
    setShowAbandonDialog(true);
  }

  function closeAbandonDialog(): void {
    if (!paused && pausedRemainingMsRef.current !== null) {
      deadlineRef.current = Date.now() + pausedRemainingMsRef.current;
      pausedRemainingMsRef.current = null;
    }
    setShowAbandonDialog(false);
  }

  async function onNextHand(): Promise<void> {
    setFeedback(null);
    await proceedAfterHand();
  }

  if (!hand) {
    return <p className="text-muted-foreground">Carregando mão…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <TrainingSessionHeader
        index={index}
        totalHands={totalHands}
        remainingSec={remainingSec}
        onAbandon={() => openAbandonDialog()}
        isPaused={paused}
        onPause={handlePause}
        onContinue={handleContinue}
      />

      <LeaveTrainingDialog
        open={showAbandonDialog}
        onOpenChange={(open) => {
          if (!open) closeAbandonDialog();
        }}
        onConfirm={finishSession}
      />

      <div className="relative">
        {paused ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm">
            <span className="text-sm font-medium text-foreground">Pausada</span>
          </div>
        ) : null}
        <div className={paused ? 'pointer-events-none select-none' : ''}>
          <div className="space-y-2 rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{situationName}</p>
            <div className="flex gap-4">
              <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
              <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
            </div>
          </div>

          <TrainingActionButtons
            actions={hand.actions}
            disabled={Boolean(feedback) || paused}
            onAction={(id) => void submit(id, false)}
          />
        </div>
      </div>

      {feedback && feedbackMode === 'IMMEDIATE' ? (
        <TrainingFeedbackPanel feedback={feedback} onNextHand={() => void onNextHand()} />
      ) : null}
    </div>
  );
}
