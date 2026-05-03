import type { GroupSummaryDto } from '@shared/ipc/types';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, PageHeader, SectionCard } from '@/components/app';
import { GroupCard } from '../components/groups/GroupCard';

export function GroupsPage(): React.ReactElement {
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newError, setNewError] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    const list = await window.api.groups.list();
    setGroups(list);
    setLoading(false);
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Grupos"
        actions={
          <Button type="button" onClick={openNewForm}>
            Novo grupo
          </Button>
        }
      />

      {showNewForm && (
        <SectionCard
          title="Novo grupo"
          contentClassName="gap-3"
          className="max-w-2xl"
          testId="new-group-form"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-group-name">Nome do grupo</Label>
            <Input
              id="new-group-name"
              type="text"
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
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleCreate()}>
              Criar
            </Button>
            <Button type="button" variant="ghost" onClick={cancelNewForm}>
              Cancelar
            </Button>
          </div>
        </SectionCard>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : !groups.length ? (
        <EmptyState
          title="Nenhum grupo cadastrado"
          description="Crie seu primeiro grupo para organizar as situações de treino."
          action={
            <Button type="button" onClick={openNewForm}>
              Criar primeiro grupo
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="groups-list">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onRenamed={() => void load()}
              onArchived={() => void load()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
