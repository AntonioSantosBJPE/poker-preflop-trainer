import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { GroupSummaryDto, SituationSummaryDto } from '@shared/ipc/types';
import {
  ConfirmActionDialog,
  EmptyState,
  EntityTable,
  PageHeader,
  type EntityTableColumn,
} from '@/components/app';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  const navigate = useNavigate();

  async function load(groupId?: number): Promise<void> {
    const list = (await window.api.situations.list(
      groupId != null ? { groupId } : undefined,
    )) as Row[];
    setRows(list);
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
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/situations/${row.id}`)}>
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
        actions={
          <Button type="button" onClick={() => navigate('/situations/new')}>
            Nova situação
          </Button>
        }
      />
      <div className="flex flex-col gap-2">
        <div className="max-w-xs">
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
            <SelectTrigger id="situations-group-filter-input" data-testid="situations-group-filter" className="w-full">
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
        {selectedGroupId != null && (
          <p className="text-sm text-muted-foreground">
            Grupo: {groups.find((g) => g.id === selectedGroupId)?.name ?? '—'}
          </p>
        )}
      </div>
      <EntityTable
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        tableTestId="situations-list-table"
        emptyState={
          <EmptyState
            title="Nenhuma situação"
            description="Crie sua primeira situação para começar os treinos."
            action={
              <Button asChild>
                <Link to="/situations/new">Criar a primeira</Link>
              </Button>
            }
            className="border-0 bg-transparent"
          />
        }
      />
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
