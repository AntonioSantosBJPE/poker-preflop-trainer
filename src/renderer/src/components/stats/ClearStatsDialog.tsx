import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeleteEstimateDto } from '@shared/ipc/types';
import { ConfirmActionDialog, DatePeriodFilter } from '@/components/app';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ClearStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function ClearStatsDialog({
  open,
  onOpenChange,
  onComplete,
}: ClearStatsDialogProps): React.ReactElement {
  const [period, setPeriod] = useState<{ fromTs?: number; toTs?: number }>({});
  const [estimate, setEstimate] = useState<DeleteEstimateDto | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const prevOpen = useRef(open);

  useEffect(() => {
    const wasOpen = prevOpen.current;
    prevOpen.current = open;
    if (wasOpen && !open) {
      return;
    }
    if (!wasOpen && open) {
      setPeriod({});
      setEstimate(null);
      setEstimating(false);
      setConfirmOpen(false);
      setDeleting(false);
      setError('');
    }
  }, [open]);

  const handlePeriodChange = useCallback((filters: { fromTs?: number; toTs?: number }) => {
    setPeriod(filters);
    if (filters.fromTs === undefined || filters.toTs === undefined) {
      setEstimate(null);
      return;
    }
    setEstimating(true);
    setError('');
    void (async () => {
      try {
        const result = (await window.api.stats.estimateDeleteSessions(
          filters,
        )) as DeleteEstimateDto | null;
        setEstimate(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao estimar');
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    })();
  }, []);

  const handleRemoveClick = useCallback(() => {
    onOpenChange(false);
    setConfirmOpen(true);
  }, [onOpenChange]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await window.api.stats.deleteSessions(period);
      setConfirmOpen(false);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover sessões');
    } finally {
      setDeleting(false);
    }
  }, [deleting, period, onComplete]);

  const canRemove = estimate != null && estimate.sessionCount > 0 && !estimating;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Limpar histórico</DialogTitle>
            <DialogDescription>
              Selecione o período e veja o impacto antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <DatePeriodFilter onChange={handlePeriodChange} />

            {estimating && (
              <p className="text-sm text-muted-foreground" data-testid="clear-stats-estimating">
                Calculando impacto...
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive" data-testid="clear-stats-error">
                {error}
              </p>
            )}

            {!estimating && estimate !== null && estimate.sessionCount > 0 && (
              <p className="text-sm font-medium" data-testid="clear-stats-preview">
                {estimate.sessionCount} sessões e {estimate.handCount} mãos serão removidas
                permanentemente.
              </p>
            )}

            {!estimating && estimate !== null && estimate.sessionCount === 0 && (
              <p className="text-sm text-muted-foreground" data-testid="clear-stats-empty">
                Nenhuma sessão encontrada neste período.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!canRemove}
              onClick={handleRemoveClick}
              data-testid="clear-stats-remove-btn"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) onOpenChange(true);
        }}
        title="Tem a certeza?"
        description={`Esta ação irá remover permanentemente ${estimate?.sessionCount ?? 0} sessões e ${estimate?.handCount ?? 0} mãos. Não é possível desfazer esta operação.`}
        confirmLabel={deleting ? 'Removendo...' : 'Sim, remover permanentemente'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
