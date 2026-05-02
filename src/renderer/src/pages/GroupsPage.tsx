import type { GroupSummaryDto } from '@shared/ipc/types';
import { useEffect, useState } from 'react';
import { GroupCard } from '../components/groups/GroupCard';

export function GroupsPage(): React.ReactElement {
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newError, setNewError] = useState('');

  async function load(): Promise<void> {
    const list = await window.api.groups.list();
    setGroups(list);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(): Promise<void> {
    setNewError('');
    try {
      await window.api.groups.create(newName.trim());
      setNewName('');
      setShowNewForm(false);
      void load();
    } catch (err) {
      setNewError(err instanceof Error ? err.message : 'Erro ao criar grupo');
    }
  }

  function openNewForm(): void {
    setNewError('');
    setShowNewForm(true);
  }

  function cancelNewForm(): void {
    setShowNewForm(false);
    setNewName('');
    setNewError('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="pt-page-title">Grupos</h1>
        <button type="button" className="pt-btn-primary text-sm" onClick={openNewForm}>
          Novo grupo
        </button>
      </div>

      {showNewForm && (
        <div className="pt-card space-y-3 p-4" data-testid="new-group-form">
          <label className="pt-label" htmlFor="new-group-name">
            Nome do grupo
          </label>
          <input
            id="new-group-name"
            type="text"
            className="pt-input max-w-md"
            value={newName}
            data-testid="new-group-input"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
            }}
          />
          {newError ? (
            <p className="text-sm text-destructive" data-testid="new-group-error">
              {newError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="pt-btn-primary text-sm"
              onClick={() => void handleCreate()}
            >
              Criar
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={cancelNewForm}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!groups.length && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Sem grupos ainda. Crie o primeiro grupo.</p>
          <button type="button" className="pt-btn-primary text-sm" onClick={openNewForm}>
            Criar primeiro grupo
          </button>
        </div>
      )}

      <div
        className={groups.length ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : ''}
        data-testid="groups-list"
      >
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            onRenamed={() => void load()}
            onArchived={() => void load()}
          />
        ))}
      </div>
    </div>
  );
}
