import type { SessionDetailDto, SessionHandDetailDto } from '@shared/ipc/types';
import { RangeGrid13, type RangeCellEdit } from '@/components/grid/RangeGrid13';
import { PlayingCard } from '@/components/PlayingCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

export function HandReviewCard({ hand, situationData, handIndex, totalHands, onPrev, onNext }: Props): React.ReactElement {
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

  return (
    <Card data-testid="hand-review-card">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="text-sm text-muted-foreground">
          Mão {handIndex + 1} de {totalHands}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <PlayingCard rank={hand.card1.rank} suit={hand.card1.suit} />
            <PlayingCard rank={hand.card2.rank} suit={hand.card2.suit} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{hand.situationName}</span>
            <span className="text-xs text-muted-foreground">Posição: {hand.situationPosition}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Resposta:</span>
          {isTimeout ? (
            <Badge variant="destructive">⏱ Timeout</Badge>
          ) : hand.isCorrect ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
              ✓ {hand.chosenAction?.name}
            </Badge>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive">
                ✗ {hand.chosenAction?.name}
              </Badge>
              {correctActionNames.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Correto: {correctActionNames.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Tempo: {(hand.responseMs / 1000).toFixed(1)}s
        </div>

        {gridActions.length > 0 && (
          <div className="flex flex-col gap-3">
            <RangeGrid13
              actions={gridActions}
              activeActionKey=""
              cells={gridCells}
              onChange={() => {}}
              readOnly
              highlightCell={hand.gridCell}
            />
            <div className="flex flex-wrap gap-3">
              {gridActions.map((a) => {
                const icon = ACTION_ICONS[situationData?.actions.find((sa) => String(sa.id) === a.clientKey)?.actionType ?? ''] ?? '';
                return (
                  <div key={a.clientKey} className="flex items-center gap-1.5 text-xs">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ background: a.colorHex }} />
                    <span>{icon ? `${icon} ` : ''}{a.name}</span>
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
