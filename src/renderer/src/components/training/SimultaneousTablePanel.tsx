import type { ReactElement } from 'react';
import { TimerIcon } from 'lucide-react';
import { PlayingCard } from '@/components/PlayingCard';
import { TrainingActionButtons, type Act } from '@/components/training/TrainingActionButtons';
import { TrainingFeedbackPanel } from '@/components/training/TrainingFeedbackPanel';

type HandData = {
  situationId: number;
  card1: { rank: string; suit: string };
  card2: { rank: string; suit: string };
  actions: Act[];
};

type FeedbackData = { ok: boolean; ms: number };

export interface SimultaneousTablePanelProps {
  tableIndex: number;
  sessionId: number;
  hand: HandData | null;
  situationName: string;
  feedback: FeedbackData | null;
  handsPlayed: number;
  totalHands: number;
  timerSeconds: number;
  deadlineMs: number | null;
  finished: boolean;
  isPaused: boolean;
  feedbackMode: 'IMMEDIATE' | 'END_OF_SESSION';
  onAction: (sessionId: number, actionId: number) => void;
  onNextHand: (sessionId: number) => void;
}

export function SimultaneousTablePanel({
  tableIndex,
  sessionId,
  hand,
  situationName,
  feedback,
  handsPlayed,
  totalHands,
  timerSeconds,
  deadlineMs,
  finished,
  isPaused,
  feedbackMode,
  onAction,
  onNextHand,
}: SimultaneousTablePanelProps): ReactElement {
  const showTimer = timerSeconds > 0 && !finished && deadlineMs !== null && !feedback;
  const progressPct = totalHands > 0 ? (handsPlayed / totalHands) * 100 : 0;
  const statusLabel = finished
    ? 'Finalizada'
    : isPaused
      ? 'Em pausa'
      : hand
        ? 'Ativa'
        : 'Carregando';

  return (
    <section
      data-testid="sim-training-table"
      className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Mesa {tableIndex + 1}
            </span>
            <p className="text-sm text-muted-foreground">{statusLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {handsPlayed}/{totalHands}
            </p>
            <div className="mt-2 h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {showTimer ? (
              <p className="mt-2 flex items-center justify-end gap-1 font-mono text-xs text-primary">
                <TimerIcon className="h-3 w-3" />
                {Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))}s
              </p>
            ) : null}
          </div>
        </div>

        {finished ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm font-medium text-primary">
            Concluída
          </div>
        ) : null}

        {!finished && hand ? (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background/70 p-4">
            {isPaused ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
                <div className="rounded-2xl border border-primary/30 bg-background/90 px-5 py-3 text-center shadow-lg">
                  <span className="block text-sm font-semibold text-foreground">Pausada</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Esta mesa aguarda retomada global.
                  </span>
                </div>
              </div>
            ) : null}
            <div className={isPaused ? 'pointer-events-none select-none' : ''}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                    Spot
                  </span>
                  <p className="text-sm font-medium text-foreground">{situationName}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
                  <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
                </div>
                <TrainingActionButtons
                  actions={hand.actions}
                  disabled={Boolean(feedback) || isPaused}
                  onAction={(actionId) => onAction(sessionId, actionId)}
                />
                {feedback && feedbackMode === 'IMMEDIATE' ? (
                  <TrainingFeedbackPanel
                    feedback={feedback}
                    onNextHand={() => onNextHand(sessionId)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
