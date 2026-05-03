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

  return (
    <section
      data-testid="sim-training-table"
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">Mesa {tableIndex + 1}</p>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {handsPlayed}/{totalHands}
          </p>
          <div className="mt-1 h-1 w-20 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {showTimer ? (
            <p className="mt-1 flex items-center justify-end gap-1 font-mono text-xs text-primary">
              <TimerIcon className="h-3 w-3" />
              {Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))}s
            </p>
          ) : null}
        </div>
      </div>

      {finished ? <p className="text-sm text-primary">Concluída</p> : null}

      {!finished && hand ? (
        <div className="relative">
          {isPaused ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm">
              <span className="text-sm font-medium text-foreground">Pausada</span>
            </div>
          ) : null}
          <div className={isPaused ? 'pointer-events-none select-none' : ''}>
            <p className="text-sm text-muted-foreground">{situationName}</p>
            <div className="flex gap-3">
              <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
              <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
            </div>
            <TrainingActionButtons
              actions={hand.actions}
              disabled={Boolean(feedback) || isPaused}
              onAction={(actionId) => onAction(sessionId, actionId)}
            />
            {feedback && feedbackMode === 'IMMEDIATE' ? (
              <TrainingFeedbackPanel feedback={feedback} onNextHand={() => onNextHand(sessionId)} />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
