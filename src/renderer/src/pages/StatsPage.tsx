import { useCallback, useEffect, useMemo, useState } from 'react';
import { ipcErrorMessage } from '@/hooks/useIpcError';
import type {
  GroupSummaryDto,
  SimultaneousTableCount,
  StatsBySituationRowDto,
  StatsFilters,
  StatsOverviewDto,
  StatsTimelinePointDto,
  StatsWorstHandRowDto,
} from '@shared/ipc/types';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DatePeriodFilter,
  EmptyState,
  EntityTable,
  FilterToolbar,
  FilterToolbarRow,
  PageHeader,
  SectionCard,
  type EntityTableColumn,
} from '@/components/app';
import { Button } from '@/components/ui/button';
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
import { useChartPalette } from '../hooks/useChartPalette';
import {
  ClearStatsDialog,
  StatsChartCard,
  StatsOverviewCards,
  StatsWorstHandsList,
} from '@/components/stats';

export function StatsPage(): React.ReactElement {
  const chart = useChartPalette();
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState<'all' | 'single' | 'simultaneous'>('all');
  const [simultaneousTableCount, setSimultaneousTableCount] = useState<
    '__all__' | `${SimultaneousTableCount}`
  >('__all__');
  const [overview, setOverview] = useState<StatsOverviewDto>({
    sessions: 0,
    hands: 0,
    accuracy: 0,
    avgResponseMs: 0,
  });
  const [timeline, setTimeline] = useState<StatsTimelinePointDto[]>([]);
  const [bySituation, setBySituation] = useState<StatsBySituationRowDto[]>([]);
  const [worstHands, setWorstHands] = useState<StatsWorstHandRowDto[]>([]);
  const [fromTs, setFromTs] = useState<number | undefined>(undefined);
  const [toTs, setToTs] = useState<number | undefined>(undefined);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const handleDatePeriodChange = useCallback((dateFilters: { fromTs?: number; toTs?: number }) => {
    setFromTs(dateFilters.fromTs);
    setToTs(dateFilters.toTs);
  }, []);

  useEffect(() => {
    void (async () => {
      const list = (await window.api.groups.list()) as GroupSummaryDto[];
      setGroups(list);
    })();
  }, []);

  useEffect(() => {
    if (sessionType === 'simultaneous') return;
    setSimultaneousTableCount('__all__');
  }, [sessionType]);

  const loadStats = useCallback(async () => {
    const filters: StatsFilters = {};
    if (activeGroupId !== null) filters.groupId = activeGroupId;
    if (sessionType !== 'all') filters.sessionType = sessionType;
    if (sessionType === 'simultaneous' && simultaneousTableCount !== '__all__') {
      filters.simultaneousTableCount = Number(simultaneousTableCount) as SimultaneousTableCount;
    }
    if (fromTs !== undefined) filters.fromTs = fromTs;
    if (toTs !== undefined) filters.toTs = toTs;
    try {
      setStatsError(null);
      setOverview(await window.api.stats.overview(filters));
      setTimeline(await window.api.stats.timeline(filters));
      setBySituation(await window.api.stats.bySituation(filters));
      setWorstHands(await window.api.stats.worstHands(filters, 15));
    } catch (err) {
      setStatsError(ipcErrorMessage(err));
    } finally {
      setInitialLoading(false);
    }
  }, [activeGroupId, sessionType, simultaneousTableCount, fromTs, toTs]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const groupTabValue = activeGroupId === null ? 'all' : String(activeGroupId);

  const bySituationColumns = useMemo<EntityTableColumn<StatsBySituationRowDto>[]>(
    () => [
      {
        key: 'name',
        header: 'Situação',
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
        key: 'accuracy',
        header: 'Acerto',
        cell: (row) => `${(row.accuracy * 100).toFixed(1)}%`,
        headerClassName: 'text-left font-medium',
        cellClassName: 'tabular-nums',
      },
      {
        key: 'avgResponseMs',
        header: 'Tempo médio',
        cell: (row) => `${row.avgResponseMs.toFixed(0)} ms`,
        headerClassName: 'text-left font-medium',
        cellClassName: 'tabular-nums',
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      {statsError ? (
        <EmptyState
          title="Erro ao carregar estatísticas"
          description={statsError}
          action={
            <Button variant="outline" onClick={() => void loadStats()}>
              Tentar novamente
            </Button>
          }
        />
      ) : initialLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <PageHeader
            title="Estatísticas"
            description="Acompanhe desempenho geral, evolução e vazamentos para escolher o próximo treino."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearDialogOpen(true)}
                data-testid="clear-stats-button"
              >
                Limpar histórico
              </Button>
            }
          />

          <ClearStatsDialog
            open={clearDialogOpen}
            onOpenChange={setClearDialogOpen}
            onComplete={loadStats}
          />

          <SectionCard
            title="Recorte de análise"
            description="Ajuste grupo, período e tipo de sessão; todos os blocos abaixo usam o mesmo recorte."
            contentClassName="gap-0 p-0"
          >
            <FilterToolbar className="rounded-none border-0 bg-transparent p-4">
              <Tabs
                value={groupTabValue}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setActiveGroupId(null);
                    return;
                  }
                  setActiveGroupId(Number(value));
                }}
              >
                <TabsList className="w-full justify-start" data-testid="stats-group-tabs">
                  <TabsTrigger value="all" data-testid="stats-tab-all">
                    Todos
                  </TabsTrigger>
                  {groups.map((group) => (
                    <TabsTrigger
                      key={group.id}
                      value={String(group.id)}
                      data-testid={`stats-tab-group-${group.id}`}
                    >
                      {group.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div data-testid="stats-date-filter">
                <DatePeriodFilter onChange={handleDatePeriodChange} />
              </div>

              <FilterToolbarRow>
                <div className="flex min-w-52 flex-col gap-1">
                  <Label>Tipo de sessão</Label>
                  <Select
                    value={sessionType}
                    onValueChange={(value) =>
                      setSessionType(value as 'all' | 'single' | 'simultaneous')
                    }
                  >
                    <SelectTrigger
                      id="stats-session-type"
                      data-testid="stats-session-type-filter"
                      className="w-full"
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="single">Individual</SelectItem>
                      <SelectItem value="simultaneous">Simultâneo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-52 flex-col gap-1">
                  <Label>Mesas simultâneas</Label>
                  <Select
                    value={simultaneousTableCount}
                    onValueChange={(value) =>
                      setSimultaneousTableCount(value as '__all__' | '2' | '3' | '4')
                    }
                    disabled={sessionType !== 'simultaneous'}
                  >
                    <SelectTrigger
                      id="stats-table-count"
                      data-testid="stats-simultaneous-count-filter"
                      className="w-full"
                    >
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
          </SectionCard>

          <StatsOverviewCards overview={overview} />

          <StatsChartCard
            title="Evolução"
            description="Tendência de acerto e tempo médio ao longo das sessões filtradas."
            hasData={timeline.length > 0}
            emptyTitle="Sem dados no período"
            emptyDescription="Jogue novas sessões para visualizar a evolução de acerto e tempo."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="date" tick={{ fill: chart.tick, fontSize: 11 }} />
                <YAxis
                  yAxisId="accuracy"
                  domain={[0, 1]}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  tick={{ fill: chart.tick, fontSize: 11 }}
                />
                <YAxis
                  yAxisId="time"
                  orientation="right"
                  tick={{ fill: chart.tick, fontSize: 11 }}
                />
                <Tooltip />
                <Line
                  yAxisId="accuracy"
                  type="monotone"
                  dataKey="accuracy"
                  stroke={chart.primary}
                  dot={false}
                  name="Acerto"
                />
                <Line
                  yAxisId="time"
                  type="monotone"
                  dataKey="avgTimeMs"
                  stroke={chart.secondary}
                  dot={false}
                  name="Tempo ms"
                />
              </LineChart>
            </ResponsiveContainer>
          </StatsChartCard>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:items-start">
            <SectionCard
              title="Ranking por situação"
              description="Spots com menor acerto ou maior tempo indicam onde concentrar estudo."
              contentClassName="p-0"
            >
              <EntityTable
                rows={bySituation}
                columns={bySituationColumns}
                getRowKey={(row) => row.situationId}
                tableTestId="stats-by-situation-table"
                className="rounded-none border-0"
                emptyState={
                  <EmptyState
                    title="Sem dados por situação"
                    description="Jogue algumas mãos para preencher o ranking por situação."
                    className="border-0 bg-transparent"
                  />
                }
              />
            </SectionCard>

            <StatsWorstHandsList rows={worstHands} />
          </div>
        </>
      )}
    </div>
  );
}
