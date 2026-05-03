import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeleteEstimateDto } from '@shared/ipc/types';
import { ConfirmActionDialog } from '@/components/app';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface DeleteSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionIds: number[];
  onComplete: () => void;
}

export function DeleteSessionsDialog({
  open,
  onOpenChange,
  sessionIds,
  onComplete,
}: DeleteSessionsDialogProps): React.ReactElement {
  const [estimate, setEstimate] = useState<DeleteEstimateDto | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const prevOpen = useRef(open);
  const deleteCompleted = useRef(false);

  useEffect(() => {
    const wasOpen = prevOpen.current;
    prevOpen.current = open;
    if (wasOpen && !open) {
      return;
    }
    if (!wasOpen && open) {
      setEstimate(null);
      setEstimating(false);
      setConfirmOpen(false);
      setDeleting(false);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEstimating(true);
    setError('');
    void (async () => {
      try {
        const result = (await window.api.training.estimateDeleteSessionsByIds({
          ids: sessionIds,
        })) as DeleteEstimateDto | null;
        setEstimate(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao estimar');
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    })();
  }, [open, sessionIds]);

  const handleRemoveClick = useCallback(() => {
    onOpenChange(false);
    setConfirmOpen(true);
  }, [onOpenChange]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await window.api.training.deleteSessionsByIds({ ids: sessionIds });
      deleteCompleted.current = true;
      setConfirmOpen(false);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover sessões');
    } finally {
      setDeleting(false);
    }
  }, [deleting, sessionIds, onComplete]);

  const canRemove = estimate != null && estimate.sessionCount > 0 && !estimating;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="delete-sessions-dialog">
          <DialogHeader>
            <DialogTitle>Remover sessões</DialogTitle>
            <DialogDescription>Veja o impacto antes de confirmar a remoção.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {estimating && (
              <p className="text-sm text-muted-foreground" data-testid="delete-sessions-estimating">
                Calculando impacto...
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive" data-testid="delete-sessions-error">
                {error}
              </p>
            )}

            {!estimating && estimate !== null && estimate.sessionCount > 0 && (
              <p className="text-sm font-medium" data-testid="delete-sessions-preview">
                {estimate.sessionCount} sessões e {estimate.handCount} mãos serão removidas
                permanentemente.
              </p>
            )}

            {!estimating && estimate !== null && estimate.sessionCount === 0 && (
              <p className="text-sm text-muted-foreground" data-testid="delete-sessions-empty">
                Nenhuma sessão encontrada.
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
              data-testid="delete-sessions-remove-btn"
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
          if (!open && !deleteCompleted.current) onOpenChange(true);
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
