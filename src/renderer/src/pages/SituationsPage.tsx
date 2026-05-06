import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { GroupSummaryDto, SituationSummaryDto } from '@shared/ipc/types';
import {
  ConfirmActionDialog,
  EmptyState,
  EntityTable,
  FilterToolbar,
  FilterToolbarRow,
  PageHeader,
  SectionCard,
  StatCard,
  type EntityTableColumn,
} from '@/components/app';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Row = Pick<SituationSummaryDto, 'id' | 'name' | 'position' | 'effectiveStack' | 'groupId'>;

export function SituationsPage(): React.ReactElement {
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [pendingArchive, setPendingArchive] = useState<Row | null>(null);
  const [situationsLoading, setSituationsLoading] = useState(true);
  const navigate = useNavigate();

  async function load(groupId?: number): Promise<void> {
    setSituationsLoading(true);
    const list = (await window.api.situations.list(
      groupId != null ? { groupId } : undefined,
    )) as Row[];
    setRows(list);
    setSituationsLoading(false);
  }

  const reload = useCallback(() => load(selectedGroupId ?? undefined), [selectedGroupId]);

  async function handleArchive(row: Row): Promise<void> {
    if (archivingId === row.id) return;
    setArchivingId(row.id);
    try {
      await window.api.situations.delete(row.id);
      await reload();
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    void (async () => {
      const g = (await window.api.groups.list()) as GroupSummaryDto[];
      setGroups(g);
    })();
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const totalSituations = groups.reduce((total, group) => total + group.situationCount, 0);

  const columns: EntityTableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Nome',
      cell: (row) => row.name,
      headerClassName: 'text-left font-medium',
    },
    {
      key: 'group',
      header: 'Grupo',
      cell: (row) => groups.find((g) => g.id === row.groupId)?.name ?? '—',
      headerClassName: 'text-left font-medium',
    },
    {
      key: 'position',
      header: 'Posição',
      cell: (row) => row.position,
      headerClassName: 'text-left font-medium',
    },
    {
      key: 'stack',
      header: 'Stack (BB)',
      cell: (row) => row.effectiveStack,
      headerClassName: 'text-left font-medium',
      cellClassName: 'tabular-nums',
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-52',
      cellClassName: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/situations/${row.id}`)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              await window.api.situations.duplicate(row.id);
              void reload();
            }}
          >
            Duplicar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={archivingId === row.id}
            onClick={() => setPendingArchive(row)}
          >
            Arquivar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Situações"
        description="Catalogue os spots que alimentam seus blocos de treino."
        actions={
          <Button type="button" onClick={() => navigate('/situations/new')}>
            Nova situação
          </Button>
        }
      />

      <SectionCard
        title="Catálogo de situações"
        description="Filtre por grupo, revise stacks e mantenha sua biblioteca pronta para treinar."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Situações exibidas"
            value={situationsLoading ? '...' : rows.length}
            description={selectedGroup ? `Filtro: ${selectedGroup.name}` : 'Todos os grupos'}
            tone={rows.length > 0 ? 'success' : 'warning'}
          />
          <StatCard
            label="Total nos grupos"
            value={totalSituations}
            description="Biblioteca ativa"
            tone={totalSituations > 0 ? 'primary' : 'muted'}
          />
          <StatCard
            label="Grupos"
            value={groups.length}
            description={groups.length > 0 ? 'Disponíveis no filtro' : 'Crie um grupo primeiro'}
            tone={groups.length > 0 ? 'primary' : 'warning'}
          />
        </div>
      </SectionCard>

      <FilterToolbar>
        <FilterToolbarRow>
          <div className="flex min-w-52 flex-col gap-1">
            <Label htmlFor="situations-group-filter-input">Filtrar por grupo</Label>
            <Select
              value={selectedGroupId != null ? String(selectedGroupId) : '__all__'}
              onValueChange={(value) => {
                if (value === '__all__') {
                  setSelectedGroupId(null);
                  return;
                }
                setSelectedGroupId(Number(value));
              }}
            >
              <SelectTrigger
                id="situations-group-filter-input"
                data-testid="situations-group-filter"
                className="w-full"
              >
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os grupos</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilterToolbarRow>
      </FilterToolbar>
      {situationsLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <EntityTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          tableTestId="situations-list-table"
          emptyState={
            <EmptyState
              title="Nenhuma situação"
              description={
                selectedGroup
                  ? `Nenhuma situação encontrada em ${selectedGroup.name}. Crie uma situação para este grupo ou limpe o filtro.`
                  : 'Crie sua primeira situação para começar os treinos.'
              }
              action={
                <Button asChild>
                  <Link
                    to={
                      selectedGroup
                        ? `/situations/new?groupId=${selectedGroup.id}`
                        : '/situations/new'
                    }
                  >
                    Criar a primeira
                  </Link>
                </Button>
              }
              className="border-0 bg-transparent"
            />
          }
        />
      )}
      <ConfirmActionDialog
        open={pendingArchive != null}
        onOpenChange={(open) => {
          if (!open) setPendingArchive(null);
        }}
        title={`Arquivar situação \"${pendingArchive?.name ?? ''}\"?`}
        description="A situação ficará inativa e deixará de aparecer nas listagens."
        confirmLabel="Arquivar"
        onConfirm={async () => {
          if (!pendingArchive) return;
          await handleArchive(pendingArchive);
          setPendingArchive(null);
        }}
      />
    </div>
  );
}
