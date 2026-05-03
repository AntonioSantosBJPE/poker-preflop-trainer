import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { LeaveTrainingDialog } from '@/components/training/LeaveTrainingDialog';
import { SimultaneousTablePanel } from '@/components/training/SimultaneousTablePanel';
import { Button } from '@/components/ui/button';
import type { FeedbackMode } from '../env';

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
  const [isPaused, setIsPaused] = useState(false);

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
    if (!tables.length || isPaused) return;
    for (const table of tables) {
      if (!table.hand && !table.finished) {
        void dealNext(table.sessionId);
      }
    }
  }, [tables, isPaused]);

  useEffect(() => {
    if (!tables.length || timerSeconds <= 0) return;
    const timer = setInterval(() => {
      setTables((current) => [...current]);
      if (isPaused) return;
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
  }, [tables, timerSeconds, isPaused]);

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
      <PageHeader
        title="Treino simultâneo"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="sim-training-pause-btn"
              onClick={() => setIsPaused((p) => !p)}
            >
              {isPaused ? 'Continuar' : 'Pausar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="sim-training-leave-btn"
              onClick={() => setShowLeaveConfirm(true)}
            >
              Encerrar
            </Button>
          </div>
        }
      />

      <LeaveTrainingDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Abandonar treino simultâneo?"
        description="As mesas ativas serão encerradas e você voltará para a configuração."
        onConfirm={abandonAll}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {tables.map((table, index) => (
          <SimultaneousTablePanel
            key={table.sessionId}
            tableIndex={index}
            sessionId={table.sessionId}
            hand={table.hand}
            situationName={table.situationName}
            feedback={table.feedback}
            handsPlayed={table.handsPlayed}
            totalHands={totalHands}
            timerSeconds={timerSeconds}
            deadlineMs={table.deadlineMs}
            finished={table.finished}
            isPaused={isPaused}
            feedbackMode={feedbackMode}
            onAction={(sessionId, actionId) => void submit(sessionId, actionId, false)}
            onNextHand={(sessionId) => void advance(sessionId)}
          />
        ))}
      </div>
    </div>
  );
}
