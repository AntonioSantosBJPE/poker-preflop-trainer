import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FeedbackMode } from '../env';
import { PlayingCard } from '../components/PlayingCard';

type Card = { rank: string; suit: string };
type Act = { id: number; name: string; colorHex: string };
type HandData = { situationId: number; card1: Card; card2: Card; actions: Act[] };
type FeedbackData = { ok: boolean; ms: number };

type TableState = {
  sessionId: number;
  hand: HandData | null;
  situationName: string;
  feedback: FeedbackData | null;
  handsPlayed: number;
  finished: boolean;
  deadlineMs: number | null;
};

export function SimultaneousTrainingSessionPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      sessionIds: number[];
      totalHands: number;
      timerSeconds: number;
      feedbackMode: FeedbackMode;
    };
  };

  const sessionIds = location.state?.sessionIds ?? [];
  const totalHands = location.state?.totalHands ?? 0;
  const timerSeconds = location.state?.timerSeconds ?? 0;
  const feedbackMode = location.state?.feedbackMode ?? 'IMMEDIATE';
  const [tables, setTables] = useState<TableState[]>([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (!sessionIds.length || !totalHands) {
      navigate('/training/simultaneous', { replace: true });
      return;
    }
    setTables(
      sessionIds.map((sessionId) => ({
        sessionId,
        hand: null,
        situationName: '',
        feedback: null,
        handsPlayed: 0,
        finished: false,
        deadlineMs: null,
      })),
    );
  }, [navigate, sessionIds, totalHands]);

  async function dealNext(sessionId: number): Promise<void> {
    const h = (await window.api.training.dealHand(sessionId)) as HandData;
    const detail = (await window.api.situations.get(h.situationId)) as { name: string };
    setTables((current) =>
      current.map((table) =>
        table.sessionId === sessionId
          ? {
              ...table,
              hand: h,
              situationName: detail.name,
              feedback: null,
              deadlineMs: timerSeconds > 0 ? Date.now() + timerSeconds * 1000 : null,
            }
          : table,
      ),
    );
  }

  useEffect(() => {
    if (!tables.length) return;
    for (const table of tables) {
      if (!table.hand && !table.finished) {
        void dealNext(table.sessionId);
      }
    }
  }, [tables]);

  useEffect(() => {
    if (!tables.length || timerSeconds <= 0) return;
    const timer = setInterval(() => {
      setTables((current) => [...current]);
      const now = Date.now();
      for (const table of tables) {
        if (
          !table.finished &&
          !table.feedback &&
          table.deadlineMs !== null &&
          table.deadlineMs <= now
        ) {
          void submit(table.sessionId, null, true);
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, [tables, timerSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCompleted = useMemo(() => tables.length > 0 && tables.every((t) => t.finished), [tables]);

  useEffect(() => {
    if (!isCompleted) return;
    navigate('/training/simultaneous/summary', { state: { sessionIds } });
  }, [isCompleted, navigate, sessionIds]);

  async function submit(
    sessionId: number,
    chosenActionId: number | null,
    timedOut: boolean,
  ): Promise<void> {
    const table = tables.find((t) => t.sessionId === sessionId);
    if (!table || table.finished || table.feedback) return;
    const res = await window.api.training.submitAnswer({ sessionId, chosenActionId, timedOut });

    if (feedbackMode === 'IMMEDIATE') {
      setTables((current) =>
        current.map((item) =>
          item.sessionId === sessionId
            ? { ...item, feedback: { ok: res.isCorrect, ms: res.responseMs }, deadlineMs: null }
            : item,
        ),
      );
      return;
    }

    await advance(sessionId);
  }

  async function advance(sessionId: number): Promise<void> {
    const table = tables.find((t) => t.sessionId === sessionId);
    if (!table || table.finished) return;
    const nextHandsPlayed = table.handsPlayed + 1;
    if (nextHandsPlayed >= totalHands) {
      await window.api.training.finishSession(sessionId);
      setTables((current) =>
        current.map((item) =>
          item.sessionId === sessionId
            ? {
                ...item,
                finished: true,
                handsPlayed: nextHandsPlayed,
                hand: null,
                feedback: null,
                deadlineMs: null,
              }
            : item,
        ),
      );
      return;
    }

    setTables((current) =>
      current.map((item) =>
        item.sessionId === sessionId
          ? { ...item, handsPlayed: nextHandsPlayed, feedback: null, deadlineMs: null }
          : item,
      ),
    );
    await dealNext(sessionId);
  }

  async function abandonAll(): Promise<void> {
    await Promise.all(sessionIds.map((sessionId) => window.api.training.finishSession(sessionId)));
    navigate('/training/simultaneous', { replace: true });
  }

  if (!tables.length) {
    return <p className="text-muted-foreground">Carregando sessão simultânea…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="pt-page-title">Treino simultâneo</h1>
        <button
          type="button"
          data-testid="sim-training-leave-btn"
          className="pt-btn-secondary"
          onClick={() => setShowLeaveConfirm(true)}
        >
          Encerrar
        </button>
      </div>
      {showLeaveConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sim-leave-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl">
            <p id="sim-leave-title" className="font-display text-lg font-semibold text-foreground">
              Abandonar treino simultâneo?
            </p>
            <p className="text-sm text-muted-foreground">
              As mesas ativas serão encerradas e você voltará para a configuração.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="pt-btn-secondary"
                onClick={() => {
                  setShowLeaveConfirm(false);
                }}
              >
                Continuar treinando
              </button>
              <button
                type="button"
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:brightness-110"
                onClick={() => void abandonAll()}
              >
                Confirmar abandono
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {tables.map((table, index) => (
          <section
            key={table.sessionId}
            data-testid="sim-training-table"
            className="space-y-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">Mesa {index + 1}</p>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {table.handsPlayed}/{totalHands}
                </p>
                {timerSeconds > 0 &&
                  !table.finished &&
                  table.deadlineMs !== null &&
                  !table.feedback && (
                    <p className="font-mono text-xs text-primary">
                      {Math.max(0, Math.ceil((table.deadlineMs - Date.now()) / 1000))}s
                    </p>
                  )}
              </div>
            </div>
            {table.finished && <p className="text-sm text-primary">Concluída</p>}
            {!table.finished && table.hand && (
              <>
                <p className="text-sm text-muted-foreground">{table.situationName}</p>
                <div className="flex gap-3">
                  <PlayingCard rank={table.hand.card1.rank} suit={table.hand.card1.suit} />
                  <PlayingCard rank={table.hand.card2.rank} suit={table.hand.card2.suit} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {table.hand.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      style={{ borderColor: action.colorHex }}
                      className="min-w-[110px] rounded-lg border-2 bg-muted px-3 py-2 text-sm font-medium text-foreground"
                      disabled={Boolean(table.feedback)}
                      onClick={() => void submit(table.sessionId, action.id, false)}
                    >
                      {action.name}
                    </button>
                  ))}
                </div>
                {table.feedback && feedbackMode === 'IMMEDIATE' && (
                  <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                    <p className={table.feedback.ok ? 'text-primary' : 'text-destructive'}>
                      {table.feedback.ok ? 'Correto' : 'Incorreto'} — {table.feedback.ms} ms
                    </p>
                    <button
                      type="button"
                      className="pt-btn-primary text-sm"
                      onClick={() => void advance(table.sessionId)}
                    >
                      Próxima mão
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
