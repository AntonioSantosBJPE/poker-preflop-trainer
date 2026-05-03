import type { ReactElement } from 'react';
import { ConfirmActionDialog } from '@/components/app/ConfirmActionDialog';

export interface LeaveTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
}

export function LeaveTrainingDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Abandonar sessão?',
  description = 'O progresso desta sessão será perdido.',
}: LeaveTrainingDialogProps): ReactElement {
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel="Confirmar abandono"
      cancelLabel="Continuar treinando"
      onConfirm={onConfirm}
    />
  );
}
