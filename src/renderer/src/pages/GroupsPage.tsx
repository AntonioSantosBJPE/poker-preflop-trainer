import type { GroupSummaryDto } from '@shared/ipc/types';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, PageHeader, SectionCard, StatCard, StatusMessage } from '@/components/app';
import { GroupCard } from '../components/groups/GroupCard';
import { ipcErrorMessage } from '@/hooks/useIpcError';

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
      setNewError(ipcErrorMessage(err));
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
        description="Organize sua biblioteca pré-flop por blocos de estudo."
        actions={
          <Button type="button" onClick={openNewForm}>
            Novo grupo
          </Button>
        }
      />

      <SectionCard
        title="Biblioteca de estudo"
        description="Cada grupo concentra situações relacionadas para treino e revisão."
        contentClassName="gap-4"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Grupos ativos"
            value={loading ? '...' : groups.length}
            description="Blocos disponíveis"
            tone={groups.length > 0 ? 'success' : 'warning'}
          />
          <StatCard
            label="Situações"
            value={
              loading ? '...' : groups.reduce((total, group) => total + group.situationCount, 0)
            }
            description="Distribuídas nos grupos"
            tone="primary"
          />
          <StatCard
            label="Próximo passo"
            value={groups.length > 0 ? 'Treinar' : 'Criar'}
            description={
              groups.length > 0 ? 'Escolha um grupo no treino' : 'Comece pelo primeiro grupo'
            }
            tone={groups.length > 0 ? 'primary' : 'warning'}
          />
        </div>
      </SectionCard>

      {showNewForm && (
        <SectionCard
          title="Novo grupo"
          description="Use nomes por formato, posição ou objetivo de estudo."
          contentClassName="gap-3"
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
              <StatusMessage tone="error" data-testid="new-group-error">
                {newError}
              </StatusMessage>
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
          description="Crie seu primeiro grupo para organizar situações e liberar um fluxo de treino mais focado."
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
