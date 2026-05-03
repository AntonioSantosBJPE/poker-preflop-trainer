import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Act } from '@/components/training/TrainingActionButtons';
import { EmptyState, PageHeader } from '@/components/app';
import { LeaveTrainingDialog } from '@/components/training/LeaveTrainingDialog';
import { TrainingActionButtons } from '@/components/training/TrainingActionButtons';
import { TrainingFeedbackPanel } from '@/components/training/TrainingFeedbackPanel';
import { TrainingSessionHeader } from '@/components/training/TrainingSessionHeader';
import { Button } from '@/components/ui/button';
import { PlayingCard } from '@/components/PlayingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessionTimer } from '@/hooks/useSessionTimer';
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
  const [sessionError, setSessionError] = useState<string | null>(null);

  const answeredRef = useRef(false);
  const feedbackRef = useRef(feedback);
  const handRef = useRef(hand);
  const showAbandonDialogRef = useRef(showAbandonDialog);
  const submitRef =
    useRef<(actionId: number | null, timedOut: boolean) => Promise<void>>(undefined);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    handRef.current = hand;
  }, [hand]);

  useEffect(() => {
    showAbandonDialogRef.current = showAbandonDialog;
  }, [showAbandonDialog]);

  const { remainingSec, isPaused, pause, resume } = useSessionTimer({
    timerSeconds,
    active: !!(hand && !showAbandonDialog),
    onTimeout: () => {
      void submitRef.current?.(null, true);
    },
  });

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
        setFeedbackMode(meta.feedbackMode as FeedbackMode);
        setIndex(meta.handsPlayed);
        await dealNextHand();
      } catch {
        if (!cancelled) {
          setSessionError('Erro ao carregar sessão');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, dealNextHand]);

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
  submitRef.current = submit;

  function handleAbandonDialogOpen(): void {
    pause();
    setShowAbandonDialog(true);
  }

  function handleAbandonDialogClose(): void {
    setShowAbandonDialog(false);
    resume();
  }

  async function onNextHand(): Promise<void> {
    setFeedback(null);
    await proceedAfterHand();
  }

  if (sessionError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Sessão de treino" />
        <EmptyState
          title="Erro ao carregar sessão"
          description={sessionError}
          action={
            <Button variant="outline" onClick={() => navigate('/training')}>
              Voltar ao treino
            </Button>
          }
        />
      </div>
    );
  }

  if (!hand) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TrainingSessionHeader
        index={index}
        totalHands={totalHands}
        remainingSec={remainingSec}
        onAbandon={() => handleAbandonDialogOpen()}
        isPaused={isPaused}
        onPause={pause}
        onContinue={resume}
      />

      <LeaveTrainingDialog
        open={showAbandonDialog}
        onOpenChange={(open) => {
          if (!open) handleAbandonDialogClose();
        }}
        onConfirm={finishSession}
      />

      <div className="relative">
        {isPaused ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm">
            <span className="text-sm font-medium text-foreground">Pausada</span>
          </div>
        ) : null}
        <div className={isPaused ? 'pointer-events-none select-none' : ''}>
          <div className="space-y-2 rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{situationName}</p>
            <div className="flex gap-4">
              <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
              <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
            </div>
          </div>

          <TrainingActionButtons
            actions={hand.actions}
            disabled={Boolean(feedback) || isPaused}
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
