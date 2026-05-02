import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { FeedbackMode } from '../env';
import { PlayingCard } from '../components/PlayingCard';

type Card = { rank: string; suit: string };
type Act = { id: number; name: string; colorHex: string };

export function TrainingSessionPage(): React.ReactElement {
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

  const deadlineRef = useRef<number | null>(null);
  const pausedRemainingMsRef = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  const answeredRef = useRef(false);
  const timerSecondsRef = useRef(timerSeconds);
  const feedbackRef = useRef(feedback);
  const handRef = useRef(hand);
  const showAbandonDialogRef = useRef(showAbandonDialog);

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
    if (!hand || showAbandonDialog) return;
    const t = setInterval(() => setTick((x) => x + 1), 200);
    return () => clearInterval(t);
  }, [hand, showAbandonDialog]);

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
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  function openAbandonDialog(): void {
    if (deadlineRef.current !== null) {
      pausedRemainingMsRef.current = Math.max(0, deadlineRef.current - Date.now());
      deadlineRef.current = null;
    }
    setShowAbandonDialog(true);
  }

  function closeAbandonDialog(): void {
    if (pausedRemainingMsRef.current !== null) {
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
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Mão {index + 1} / {totalHands}
        </span>
        <div className="flex items-center gap-4">
          {remainingSec !== null && (
            <span className="font-mono tabular-nums text-primary">{remainingSec}s</span>
          )}
          <button
            type="button"
            className="rounded-lg border border-border bg-muted px-3 py-1 text-sm text-foreground transition-colors hover:border-destructive hover:text-destructive"
            onClick={() => openAbandonDialog()}
          >
            Abandonar
          </button>
        </div>
      </div>

      {showAbandonDialog && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="abandon-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl">
            <p id="abandon-title" className="font-display text-lg font-semibold text-foreground">
              Abandonar sessão?
            </p>
            <p className="text-sm text-muted-foreground">O progresso desta sessão será perdido.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="pt-btn-secondary"
                onClick={() => closeAbandonDialog()}
              >
                Continuar treinando
              </button>
              <button
                type="button"
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:brightness-110"
                onClick={() => void finishSession()}
              >
                Confirmar abandono
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{situationName}</p>
        <div className="flex gap-4">
          <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
          <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {hand.actions.map((a) => (
          <button
            key={a.id}
            type="button"
            style={{ borderColor: a.colorHex }}
            className="min-w-[120px] rounded-lg border-2 bg-muted px-4 py-3 font-medium text-foreground"
            disabled={Boolean(feedback)}
            onClick={() => void submit(a.id, false)}
          >
            {a.name}
          </button>
        ))}
      </div>

      {feedback && feedbackMode === 'IMMEDIATE' && (
        <div className="space-y-3 rounded-lg border border-border bg-card/90 p-4">
          <p className={feedback.ok ? 'text-primary' : 'text-destructive'}>
            {feedback.ok ? 'Correto' : 'Incorreto'} — {feedback.ms} ms
          </p>
          <button
            type="button"
            className="pt-btn-primary text-sm"
            onClick={() => void onNextHand()}
          >
            Próxima mão
          </button>
        </div>
      )}
    </div>
  );
}
