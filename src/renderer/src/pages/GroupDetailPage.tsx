import type { GroupSummaryDto } from '@shared/ipc/types';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ConfirmActionDialog,
  EmptyState,
  EntityTable,
  PageHeader,
  type EntityTableColumn,
} from '@/components/app';
import { Button } from '@/components/ui/button';

type SituationRow = {
  id: number;
  name: string;
  position: string;
  effectiveStack: number;
};

export function GroupDetailPage(): React.ReactElement {
  const { groupId: groupIdParam } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const groupId = groupIdParam ? Number(groupIdParam) : NaN;

  const [group, setGroup] = useState<GroupSummaryDto | null | undefined>(undefined);
  const [situations, setSituations] = useState<SituationRow[]>([]);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [pendingArchive, setPendingArchive] = useState<SituationRow | null>(null);

  async function loadGroupsAndSituations(): Promise<void> {
    if (!Number.isFinite(groupId)) {
      setGroup(null);
      return;
    }
    const groups = await window.api.groups.list();
    const foundGroup = groups.find((item) => item.id === groupId) ?? null;
    setGroup(foundGroup);
    if (!foundGroup) {
      setSituations([]);
      return;
    }
    const list = await window.api.situations.list({ groupId });
    const rows: SituationRow[] = list.map((item) => ({
      id: item.id,
      name: item.name,
      position: item.position,
      effectiveStack: item.effectiveStack,
    }));
    setSituations(rows);
  }

  useEffect(() => {
    void loadGroupsAndSituations();
  }, [groupId]);

  async function handleArchive(row: SituationRow): Promise<void> {
    if (archivingId === row.id) return;
    setArchivingId(row.id);
    try {
      await window.api.situations.delete(row.id);
      await loadGroupsAndSituations();
    } finally {
      setArchivingId(null);
    }
  }

  const columns: EntityTableColumn<SituationRow>[] = [
    {
      key: 'name',
      header: 'Nome',
      cell: (row) => row.name,
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
              void loadGroupsAndSituations();
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

  if (group === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (group === null) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="Grupo não encontrado"
          description="O grupo informado não existe ou já foi arquivado."
          action={
            <Button asChild>
              <Link to="/groups">Voltar para grupos</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={group.name}
        backLink={{ to: '/groups', label: '← Grupos' }}
        actions={
          <Button
            type="button"
            data-testid="new-situation-btn"
            onClick={() => navigate(`/situations/new?groupId=${group.id}`)}
          >
            Nova situação
          </Button>
        }
      />

      <EntityTable
        rows={situations}
        columns={columns}
        getRowKey={(row) => row.id}
        tableTestId="group-detail-situations"
        emptyState={
          <EmptyState
            title="Nenhuma situação neste grupo"
            description="Crie a primeira situação deste grupo para começar."
            action={
              <Button asChild>
                <Link to={`/situations/new?groupId=${group.id}`}>Criar a primeira?</Link>
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
        title={`Arquivar situação "${pendingArchive?.name ?? ''}"?`}
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
