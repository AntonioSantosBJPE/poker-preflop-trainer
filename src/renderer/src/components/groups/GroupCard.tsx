import type { GroupSummaryDto } from '@shared/ipc/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmActionDialog, SectionCard } from '@/components/app';

export interface GroupCardProps {
  group: GroupSummaryDto;
  onRenamed: () => void;
  onArchived: () => void;
}

export function GroupCard({ group, onRenamed, onArchived }: GroupCardProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [renameError, setRenameError] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  async function handleSaveRename(): Promise<void> {
    setRenameError('');
    try {
      await window.api.groups.rename(group.id, editName.trim());
      setEditing(false);
      onRenamed();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Erro ao renomear grupo');
    }
  }

  function handleCancelRename(): void {
    setEditing(false);
    setEditName(group.name);
    setRenameError('');
  }

  async function handleArchive(): Promise<void> {
    if (archiving) return;
    setArchiving(true);
    setArchiveError('');
    try {
      await window.api.groups.archive(group.id);
      onArchived();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Erro ao arquivar grupo');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <SectionCard className="h-full" contentClassName="gap-4 p-4" testId="group-card">
      <div className="flex flex-col gap-1">
        {editing ? (
          <>
            <Label className="sr-only" htmlFor={`rename-${group.id}`}>
              Novo nome do grupo
            </Label>
            <Input
              id={`rename-${group.id}`}
              type="text"
              className="text-base font-medium"
              value={editName}
              data-testid="group-rename-input"
              onChange={(e) => setEditName(e.target.value)}
            />
            {renameError ? (
              <p className="text-sm text-destructive" data-testid="group-rename-error">
                {renameError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" size="sm" onClick={() => void handleSaveRename()}>
                Salvar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancelRename}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <Link
              to={`/groups/${group.id}`}
              className="font-display text-lg font-semibold text-foreground hover:text-primary"
            >
              {group.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {group.situationCount} {group.situationCount === 1 ? 'situação' : 'situações'}
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="group-rename-btn"
            onClick={() => {
              setEditName(group.name);
              setRenameError('');
              setEditing(true);
            }}
          >
            Renomear
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="group-archive-btn"
            disabled={archiving}
            onClick={() => setArchiveDialogOpen(true)}
          >
            Arquivar
          </Button>
        </div>
      )}
      {archiveError ? <p className="text-sm text-destructive">{archiveError}</p> : null}
      <ConfirmActionDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title={`Arquivar grupo \"${group.name}\"?`}
        description="Isto arquivará também as situações do grupo."
        confirmLabel="Arquivar"
        onConfirm={handleArchive}
      />
    </SectionCard>
  );
}
