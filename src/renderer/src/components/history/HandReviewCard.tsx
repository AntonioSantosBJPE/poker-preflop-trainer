import type { SessionDetailDto, SessionHandDetailDto } from '@shared/ipc/types';
import { RangeGrid13, type RangeCellEdit } from '@/components/grid/RangeGrid13';
import { PlayingCard } from '@/components/PlayingCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  hand: SessionHandDetailDto;
  situationData: SessionDetailDto['situationActionsMap'][number] | undefined;
  handIndex: number;
  totalHands: number;
  onPrev: () => void;
  onNext: () => void;
};

const ACTION_ICONS: Record<string, string> = {
  FOLD: '↺',
  CALL: '↻',
};

function AnswerSummary({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'success' | 'destructive' | 'warning' | 'muted';
}): React.ReactElement {
  const toneClasses = {
    success: 'border-success/30 bg-success/10 text-success',
    destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    muted: 'border-border bg-muted/40 text-foreground',
  };

  return (
    <div className={cn('rounded-lg border p-3', toneClasses[tone])}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

export function HandReviewCard({
  hand,
  situationData,
  handIndex,
  totalHands,
  onPrev,
  onNext,
}: Props): React.ReactElement {
  const gridActions = (situationData?.actions ?? []).map((a) => ({
    clientKey: String(a.id),
    colorHex: a.colorHex,
    name: a.name,
  }));

  const gridCells: RangeCellEdit[] = (situationData?.rangeCells ?? []).map((c) => ({
    actionClientKey: String((c as { actionId: number }).actionId),
    rowIndex: c.rowIndex,
    colIndex: c.colIndex,
    frequency: c.frequency,
  }));

  const isTimeout = hand.chosenAction === null;
  const correctActionNames = hand.correctActionIds
    .map((id) => situationData?.actions.find((a) => a.id === id)?.name)
    .filter(Boolean);
  const statusTone = isTimeout ? 'warning' : hand.isCorrect ? 'success' : 'destructive';
  const statusLabel = isTimeout ? 'Tempo esgotado' : hand.isCorrect ? 'Correta' : 'Incorreta';
  const correctLabel = correctActionNames.length > 0 ? correctActionNames.join(', ') : '—';

  return (
    <Card data-testid="hand-review-card" className="overflow-hidden">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">
              Mão {handIndex + 1} de {totalHands}
            </p>
            <p className="text-xs text-muted-foreground">
              Compare a decisão tomada com o range esperado para este spot.
            </p>
          </div>
          <Badge
            variant={statusTone === 'destructive' ? 'destructive' : 'outline'}
            className={cn(
              'px-3 py-1',
              statusTone === 'success' && 'border-success/30 bg-success/10 text-success',
              statusTone === 'warning' && 'border-warning/30 bg-warning/10 text-warning',
            )}
          >
            {statusLabel}
          </Badge>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <div className="flex gap-2 md:justify-center">
            <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
            <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-display text-lg font-semibold">{hand.situationName}</span>
            <span className="text-sm text-muted-foreground">Posição: {hand.situationPosition}</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <AnswerSummary
            label="Sua resposta"
            tone={isTimeout ? 'warning' : hand.isCorrect ? 'success' : 'destructive'}
            value={
              isTimeout ? (
                <span>⏱ Timeout</span>
              ) : hand.isCorrect ? (
                <span>✓ {hand.chosenAction?.name}</span>
              ) : (
                <span>✗ {hand.chosenAction?.name}</span>
              )
            }
          />
          <AnswerSummary
            label="Resposta correta"
            tone={hand.isCorrect ? 'success' : 'muted'}
            value={<span>Correto: {correctLabel}</span>}
          />
          <AnswerSummary
            label="Tempo"
            value={<span>{(hand.responseMs / 1000).toFixed(1)}s</span>}
          />
        </div>

        {gridActions.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Range esperado</p>
                <p className="text-xs text-muted-foreground">
                  A célula destacada corresponde à mão revisada.
                </p>
              </div>
            </div>
            <RangeGrid13
              actions={gridActions}
              activeActionKey=""
              cells={gridCells}
              onChange={() => {}}
              readOnly
              highlightCell={hand.gridCell}
            />
            <div className="flex flex-wrap gap-3 border-t border-border pt-3">
              {gridActions.map((a) => {
                const icon =
                  ACTION_ICONS[
                    situationData?.actions.find((sa) => String(sa.id) === a.clientKey)
                      ?.actionType ?? ''
                  ] ?? '';
                return (
                  <div
                    key={a.clientKey}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2 py-1 text-xs"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ background: a.colorHex }}
                    />
                    <span>
                      {icon ? `${icon} ` : ''}
                      {a.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="outline" onClick={onPrev} disabled={handIndex === 0}>
            ← Anterior
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {handIndex + 1} / {totalHands}
          </span>
          <Button variant="outline" onClick={onNext} disabled={handIndex >= totalHands - 1}>
            Próxima →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
