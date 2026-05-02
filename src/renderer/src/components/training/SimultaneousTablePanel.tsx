import type { ReactElement } from 'react';
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
  feedbackMode,
  onAction,
  onNextHand,
}: SimultaneousTablePanelProps): ReactElement {
  const showTimer = timerSeconds > 0 && !finished && deadlineMs !== null && !feedback;

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
          {showTimer ? (
            <p className="font-mono text-xs text-primary">
              {Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))}s
            </p>
          ) : null}
        </div>
      </div>

      {finished ? <p className="text-sm text-primary">Concluída</p> : null}

      {!finished && hand ? (
        <>
          <p className="text-sm text-muted-foreground">{situationName}</p>
          <div className="flex gap-3">
            <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
            <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
          </div>
          <TrainingActionButtons
            actions={hand.actions}
            disabled={Boolean(feedback)}
            onAction={(actionId) => onAction(sessionId, actionId)}
          />
          {feedback && feedbackMode === 'IMMEDIATE' ? (
            <TrainingFeedbackPanel feedback={feedback} onNextHand={() => onNextHand(sessionId)} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
