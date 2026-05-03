import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { GroupSummaryDto, SessionHistoryItemDto, SimultaneousTableCount } from '@shared/ipc/types';
import { formatDuration } from '@shared/utils/format';
import { EmptyState, EntityTable, FilterToolbar, FilterToolbarRow, PageHeader, type EntityTableColumn } from '@/components/app';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { SessionListResponse } from '@shared/ipc/types';

function getPageNumbers(current: number, total: number): number[] {
  const pages: number[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (current > 3) pages.push(-1);
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push(-1);
  pages.push(total);
  return pages;
}

export function HistoryPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [data, setData] = useState<SessionListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const activeGroupId = searchParams.get('groupId') ? Number(searchParams.get('groupId')) : null;
  const sessionTypeRaw = searchParams.get('sessionType');
  const sessionType: 'all' | 'single' | 'simultaneous' =
    sessionTypeRaw === 'single' || sessionTypeRaw === 'simultaneous' ? sessionTypeRaw : 'all';
  const tableCountRaw = searchParams.get('tableCount');
  const tableCount: '' | '2' | '3' | '4' =
    tableCountRaw === '2' || tableCountRaw === '3' || tableCountRaw === '4' ? tableCountRaw : '';

  useEffect(() => {
    void (async () => {
      const list = await window.api.groups.list();
      setGroups(list);
    })();
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '' || (key === 'page' && value === '1')) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (p: number) => updateParams({ page: String(Math.max(1, p)) }),
    [updateParams],
  );

  useEffect(() => {
    setLoading(true);
    const filters: { page: number; groupId?: number; sessionType?: 'single' | 'simultaneous'; simultaneousTableCount?: SimultaneousTableCount } = { page };
    if (activeGroupId !== null) filters.groupId = activeGroupId;
    if (sessionType !== 'all') filters.sessionType = sessionType;
    if (tableCount) filters.simultaneousTableCount = Number(tableCount) as SimultaneousTableCount;
    void window.api.training.listSessions(filters).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [page, activeGroupId, sessionType, tableCount]);

  const groupTabValue = activeGroupId === null ? 'all' : String(activeGroupId);

  const handleGroupChange = useCallback(
    (value: string) => {
      if (value === 'all') {
        updateParams({ groupId: null, page: null });
      } else {
        updateParams({ groupId: value, page: null });
      }
    },
    [updateParams],
  );

  const handleSessionTypeChange = useCallback(
    (value: string) => {
      const updates: Record<string, string | null> = { sessionType: value === 'all' ? null : value, page: null };
      if (value !== 'simultaneous') updates.tableCount = null;
      updateParams(updates);
    },
    [updateParams],
  );

  const handleTableCountChange = useCallback(
    (value: string) => {
      updateParams({ tableCount: value || null, page: null });
    },
    [updateParams],
  );

  const columns = useMemo<EntityTableColumn<SessionHistoryItemDto>[]>(
    () => [
      {
        key: 'date',
        header: 'Data',
        cell: (row) => new Date(row.startedAt).toLocaleString('pt-BR'),
      },
      {
        key: 'group',
        header: 'Grupo',
        cell: (row) => row.groupName ?? '—',
      },
      {
        key: 'situations',
        header: 'Situações',
        cell: (row) => row.situationCount,
        cellClassName: 'tabular-nums',
      },
      {
        key: 'result',
        header: 'Resultado',
        cell: (row) => `${(row.accuracy * 100).toFixed(1)}%`,
        cellClassName: 'tabular-nums',
      },
      {
        key: 'duration',
        header: 'Duração',
        cell: (row) => (row.durationMs !== null ? formatDuration(row.durationMs) : '—'),
      },
      {
        key: 'type',
        header: 'Tipo',
        cell: (row) => (
          <Badge variant="secondary">
            {row.sessionType === 'simultaneous' ? `Simultâneo (${row.simultaneousTableCount})` : 'Individual'}
          </Badge>
        ),
      },
      {
        key: 'hands',
        header: 'Mãos',
        cell: (row) => `${row.handsPlayed}/${row.totalHands}`,
        cellClassName: 'tabular-nums',
      },
    ],
    [],
  );

  const totalPages = data?.totalPages ?? 0;
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Histórico" />

      <FilterToolbar>
        <Tabs value={groupTabValue} onValueChange={handleGroupChange}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {groups.map((g) => (
              <TabsTrigger key={g.id} value={String(g.id)}>
                {g.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <FilterToolbarRow>
          <div className="flex min-w-44 flex-col gap-1">
            <Label>Tipo de sessão</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={sessionType}
              onChange={(e) => handleSessionTypeChange(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="single">Individual</option>
              <option value="simultaneous">Simultâneo</option>
            </select>
          </div>
          <div className="flex min-w-44 flex-col gap-1">
            <Label>Mesas simultâneas</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={tableCount}
              onChange={(e) => handleTableCountChange(e.target.value)}
              disabled={sessionType !== 'simultaneous'}
            >
              <option value="">Todas</option>
              <option value="2">2 mesas</option>
              <option value="3">3 mesas</option>
              <option value="4">4 mesas</option>
            </select>
          </div>
        </FilterToolbarRow>
      </FilterToolbar>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <EntityTable
          rows={data?.items ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/history/${row.id}${location.search}`, { state: { search: location.search } })}
          tableTestId="history-sessions-table"
          emptyState={
            <EmptyState
              title="Nenhuma sessão encontrada"
              description="Complete uma sessão de treino para vê-la aqui."
            />
          }
        />
      )}

      {data && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              />
            </PaginationItem>
            {pageNumbers.map((p, i) =>
              p === -1 ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <span className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">…</span>
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => setPage(p)}
                    size="default"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
