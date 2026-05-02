import { useEffect, useMemo, useState } from 'react';
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
  EmptyState,
  EntityTable,
  FilterToolbar,
  FilterToolbarRow,
  PageHeader,
  type EntityTableColumn,
} from '@/components/app';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChartPalette } from '../hooks/useChartPalette';
import { StatsChartCard, StatsOverviewCards, StatsWorstHandsList } from '@/components/stats';

export function StatsPage(): React.ReactElement {
  const chart = useChartPalette();
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState<'all' | 'single' | 'simultaneous'>('all');
  const [simultaneousTableCount, setSimultaneousTableCount] = useState<
    '' | `${SimultaneousTableCount}`
  >('');
  const [overview, setOverview] = useState<StatsOverviewDto>({
    sessions: 0,
    hands: 0,
    accuracy: 0,
    avgResponseMs: 0,
  });
  const [timeline, setTimeline] = useState<StatsTimelinePointDto[]>([]);
  const [bySituation, setBySituation] = useState<StatsBySituationRowDto[]>([]);
  const [worstHands, setWorstHands] = useState<StatsWorstHandRowDto[]>([]);

  useEffect(() => {
    void (async () => {
      const list = (await window.api.groups.list()) as GroupSummaryDto[];
      setGroups(list);
    })();
  }, []);

  useEffect(() => {
    if (sessionType === 'simultaneous') return;
    setSimultaneousTableCount('');
  }, [sessionType]);

  useEffect(() => {
    void (async () => {
      const filters: StatsFilters = {};
      if (activeGroupId !== null) filters.groupId = activeGroupId;
      if (sessionType !== 'all') filters.sessionType = sessionType;
      if (sessionType === 'simultaneous' && simultaneousTableCount) {
        filters.simultaneousTableCount = Number(simultaneousTableCount) as SimultaneousTableCount;
      }
      setOverview(await window.api.stats.overview(filters));
      setTimeline(await window.api.stats.timeline(filters));
      setBySituation(await window.api.stats.bySituation(filters));
      setWorstHands(await window.api.stats.worstHands(filters, 15));
    })();
  }, [activeGroupId, sessionType, simultaneousTableCount]);

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
        header: 'Pos.',
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
    <div className="flex flex-col gap-8">
      <PageHeader title="Estatísticas" />

      <FilterToolbar>
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

        <FilterToolbarRow>
          <div className="flex min-w-52 flex-col gap-1">
            <Label htmlFor="stats-session-type">Tipo de sessão</Label>
            <select
              id="stats-session-type"
              data-testid="stats-session-type-filter"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={sessionType}
              onChange={(event) =>
                setSessionType(event.currentTarget.value as 'all' | 'single' | 'simultaneous')
              }
            >
              <option value="all">Todos</option>
              <option value="single">Individual</option>
              <option value="simultaneous">Simultâneo</option>
            </select>
          </div>
          <div className="flex min-w-52 flex-col gap-1">
            <Label htmlFor="stats-table-count">Mesas simultâneas</Label>
            <select
              id="stats-table-count"
              data-testid="stats-simultaneous-count-filter"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              value={simultaneousTableCount}
              onChange={(event) =>
                setSimultaneousTableCount(event.currentTarget.value as '' | '2' | '3' | '4')
              }
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

      <StatsOverviewCards overview={overview} />

      <StatsChartCard
        title="Evolução"
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

      <EntityTable
        rows={bySituation}
        columns={bySituationColumns}
        getRowKey={(row) => row.situationId}
        tableTestId="stats-by-situation-table"
        emptyState={
          <EmptyState
            title="Sem dados por situação"
            description="Jogue algumas mãos para preencher o ranking por situação."
            className="border-0 bg-transparent"
          />
        }
      />

      <StatsWorstHandsList rows={worstHands} />
    </div>
  );
}
