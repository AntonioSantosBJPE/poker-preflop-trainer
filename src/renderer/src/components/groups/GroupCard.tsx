import type { GroupSummaryDto } from '@shared/ipc/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
    const ok = confirm(
      `Arquivar grupo "${group.name}"? Isto arquivará também as situações do grupo.`,
    );
    if (!ok) return;
    setArchiving(true);
    try {
      await window.api.groups.archive(group.id);
      onArchived();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao arquivar grupo');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="pt-card flex flex-col gap-4 p-4" data-testid="group-card">
      <div className="space-y-1">
        {editing ? (
          <>
            <label className="pt-label sr-only" htmlFor={`rename-${group.id}`}>
              Novo nome do grupo
            </label>
            <input
              id={`rename-${group.id}`}
              type="text"
              className="pt-input w-full text-base font-medium"
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
              <button
                type="button"
                className="pt-btn-primary text-sm"
                onClick={() => void handleSaveRename()}
              >
                Salvar
              </button>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={handleCancelRename}
              >
                Cancelar
              </button>
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
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            data-testid="group-rename-btn"
            onClick={() => {
              setEditName(group.name);
              setRenameError('');
              setEditing(true);
            }}
          >
            Renomear
          </button>
          <button
            type="button"
            className="text-sm text-destructive underline-offset-4 hover:underline"
            data-testid="group-archive-btn"
            disabled={archiving}
            onClick={() => void handleArchive()}
          >
            Arquivar
          </button>
        </div>
      )}
    </div>
  );
}
