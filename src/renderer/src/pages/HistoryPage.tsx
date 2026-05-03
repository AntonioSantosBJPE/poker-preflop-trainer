import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type {
  GroupSummaryDto,
  SessionHistoryItemDto,
  SimultaneousTableCount,
} from '@shared/ipc/types';
import { formatDuration } from '@shared/utils/format';
import {
  DatePeriodFilter,
  EmptyState,
  EntityTable,
  FilterToolbar,
  FilterToolbarRow,
  PageHeader,
  type EntityTableColumn,
} from '@/components/app';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { SessionListResponse } from '@shared/ipc/types';
import { toast } from 'sonner';
import { SelectionToolbar } from '@/components/history/SelectionToolbar';
import { DeleteSessionsDialog } from '@/components/history/DeleteSessionsDialog';

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
  const selectedRef = useRef<Set<number>>(new Set());
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const activeGroupId = searchParams.get('groupId') ? Number(searchParams.get('groupId')) : null;
  const sessionTypeRaw = searchParams.get('sessionType');
  const sessionType: 'all' | 'single' | 'simultaneous' =
    sessionTypeRaw === 'single' || sessionTypeRaw === 'simultaneous' ? sessionTypeRaw : 'all';
  const tableCountRaw = searchParams.get('tableCount');
  const tableCount: '__all__' | '2' | '3' | '4' =
    tableCountRaw === '2' || tableCountRaw === '3' || tableCountRaw === '4'
      ? tableCountRaw
      : '__all__';

  const fromTs = searchParams.get('fromTs') ? Number(searchParams.get('fromTs')) : undefined;
  const toTs = searchParams.get('toTs') ? Number(searchParams.get('toTs')) : undefined;
  const ignoreInitialFilter = useRef(fromTs !== undefined || toTs !== undefined);

  useEffect(() => {
    void (async () => {
      const list = await window.api.groups.list();
      setGroups(list);
    })();
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === '' || (key === 'page' && value === '1')) {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (p: number) => updateParams({ page: String(Math.max(1, p)) }),
    [updateParams],
  );

  useEffect(() => {
    setLoading(true);
    const filters: {
      page: number;
      groupId?: number;
      sessionType?: 'single' | 'simultaneous';
      simultaneousTableCount?: SimultaneousTableCount;
      fromTs?: number;
      toTs?: number;
    } = { page };
    if (activeGroupId !== null) filters.groupId = activeGroupId;
    if (sessionType !== 'all') filters.sessionType = sessionType;
    if (tableCount !== '__all__')
      filters.simultaneousTableCount = Number(tableCount) as SimultaneousTableCount;
    if (fromTs !== undefined) filters.fromTs = fromTs;
    if (toTs !== undefined) filters.toTs = toTs;
    void window.api.training.listSessions(filters).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [page, activeGroupId, sessionType, tableCount, fromTs, toTs, refreshCounter]);

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
      const updates: Record<string, string | null> = {
        sessionType: value === 'all' ? null : value,
        page: null,
      };
      if (value !== 'simultaneous') updates.tableCount = null;
      updateParams(updates);
    },
    [updateParams],
  );

  const handleTableCountChange = useCallback(
    (value: string) => {
      updateParams({ tableCount: value === '__all__' ? null : value, page: null });
    },
    [updateParams],
  );

  const handlePeriodChange = useCallback(
    (filters: { fromTs?: number; toTs?: number }) => {
      if (ignoreInitialFilter.current) {
        ignoreInitialFilter.current = false;
        return;
      }
      updateParams({
        fromTs: filters.fromTs !== undefined ? String(filters.fromTs) : null,
        toTs: filters.toTs !== undefined ? String(filters.toTs) : null,
        page: null,
      });
    },
    [updateParams],
  );

  const handleSelectionChange = useCallback((keys: Set<number | string>) => {
    selectedRef.current = new Set(Array.from(keys, Number));
    forceRender();
  }, []);

  const handleClearSelection = useCallback(() => {
    selectedRef.current = new Set();
    forceRender();
  }, []);

  const handleReviewMultiple = useCallback(() => {
    const ids = Array.from(selectedRef.current);
    if (ids.length === 1) {
      navigate(`/history/${ids[0]}${location.search}`, {
        state: { search: location.search },
      });
    } else {
      navigate(`/history/review-multi?ids=${ids.join(',')}`);
    }
  }, [navigate, location.search]);

  const handleDeleteComplete = useCallback(() => {
    selectedRef.current = new Set();
    forceRender();
    setRefreshCounter((c) => c + 1);
    toast.success('Sessões removidas com sucesso.');
  }, []);

  useEffect(() => {
    if (selectedRef.current.size > 0) {
      selectedRef.current = new Set();
      forceRender();
    }
  }, [activeGroupId, sessionType, fromTs, toTs]);

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
            {row.sessionType === 'simultaneous'
              ? `Simultâneo (${row.simultaneousTableCount})`
              : 'Individual'}
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

        <div data-testid="date-period-filter">
          <DatePeriodFilter onChange={handlePeriodChange} />
        </div>

        <FilterToolbarRow>
          <div className="flex min-w-44 flex-col gap-1">
            <Label>Tipo de sessão</Label>
            <Select value={sessionType} onValueChange={handleSessionTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="single">Individual</SelectItem>
                <SelectItem value="simultaneous">Simultâneo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-44 flex-col gap-1">
            <Label>Mesas simultâneas</Label>
            <Select
              value={tableCount}
              onValueChange={handleTableCountChange}
              disabled={sessionType !== 'simultaneous'}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="2">2 mesas</SelectItem>
                <SelectItem value="3">3 mesas</SelectItem>
                <SelectItem value="4">4 mesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FilterToolbarRow>
      </FilterToolbar>

      {selectedRef.current.size > 0 && (
        <SelectionToolbar
          selectedCount={selectedRef.current.size}
          onRemove={() => setDeleteDialogOpen(true)}
          onReviewMultiple={handleReviewMultiple}
          onClearSelection={handleClearSelection}
        />
      )}

      <DeleteSessionsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        sessionIds={Array.from(selectedRef.current)}
        onComplete={handleDeleteComplete}
      />

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
          onRowClick={(row) =>
            navigate(`/history/${row.id}${location.search}`, { state: { search: location.search } })
          }
          selectable={true}
          selectedKeys={selectedRef.current as Set<number | string>}
          onSelectionChange={handleSelectionChange}
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
              <PaginationPrevious onClick={() => setPage(page - 1)} disabled={page === 1} />
            </PaginationItem>
            {pageNumbers.map((p, i) =>
              p === -1 ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <span className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">
                    …
                  </span>
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink isActive={p === page} onClick={() => setPage(p)} size="default">
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext onClick={() => setPage(page + 1)} disabled={page >= totalPages} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
