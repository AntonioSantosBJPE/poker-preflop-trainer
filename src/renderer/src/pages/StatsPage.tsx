import { useEffect, useState } from 'react';
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
import { useChartPalette } from '../hooks/useChartPalette';

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
  const [bySit, setBySit] = useState<StatsBySituationRowDto[]>([]);
  const [worst, setWorst] = useState<StatsWorstHandRowDto[]>([]);

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
      const ov = await window.api.stats.overview(filters);
      setOverview(ov);
      const tl = await window.api.stats.timeline(filters);
      setTimeline(tl);
      const bs = await window.api.stats.bySituation(filters);
      setBySit(bs);
      const w = await window.api.stats.worstHands(filters, 15);
      setWorst(w);
    })();
  }, [activeGroupId, sessionType, simultaneousTableCount]);

  return (
    <div className="space-y-8">
      <h1 className="pt-page-title">Estatísticas</h1>
      <div
        className="flex gap-1 overflow-x-auto border-b border-border pb-px"
        role="tablist"
        data-testid="stats-group-tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeGroupId === null}
          onClick={() => setActiveGroupId(null)}
          className={[
            'whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
            activeGroupId === null
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
          data-testid="stats-tab-all"
        >
          Todos
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={activeGroupId === g.id}
            onClick={() => setActiveGroupId(g.id)}
            className={[
              'whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
              activeGroupId === g.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
            data-testid={`stats-tab-group-${g.id}`}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor="stats-session-type">
          <span className="text-muted-foreground">Tipo de sessão</span>
          <select
            id="stats-session-type"
            data-testid="stats-session-type-filter"
            className="rounded-lg border border-border bg-background px-3 py-2"
            value={sessionType}
            onChange={(event) =>
              setSessionType(event.currentTarget.value as 'all' | 'single' | 'simultaneous')
            }
          >
            <option value="all">Todos</option>
            <option value="single">Individual</option>
            <option value="simultaneous">Simultâneo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="stats-table-count">
          <span className="text-muted-foreground">Mesas simultâneas</span>
          <select
            id="stats-table-count"
            data-testid="stats-simultaneous-count-filter"
            className="rounded-lg border border-border bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
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
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4 md:items-stretch">
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Sessões</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">
            {overview.sessions}
          </p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Mãos</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">
            {overview.hands}
          </p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Acerto geral</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">
            {(overview.accuracy * 100).toFixed(1)}%
          </p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Tempo médio</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">
            {overview.avgResponseMs.toFixed(0)} ms
          </p>
        </div>
      </div>

      <div className="h-72 rounded-xl border border-border bg-card p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="date" tick={{ fill: chart.tick, fontSize: 11 }} />
            <YAxis
              yAxisId="a"
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: chart.tick, fontSize: 11 }}
            />
            <YAxis yAxisId="b" orientation="right" tick={{ fill: chart.tick, fontSize: 11 }} />
            <Tooltip />
            <Line
              yAxisId="a"
              type="monotone"
              dataKey="accuracy"
              stroke={chart.primary}
              dot={false}
              name="Acerto"
            />
            <Line
              yAxisId="b"
              type="monotone"
              dataKey="avgTimeMs"
              stroke={chart.secondary}
              dot={false}
              name="Tempo ms"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Situação</th>
              <th className="p-3 text-left font-medium">Pos.</th>
              <th className="p-3 text-left font-medium">Acerto</th>
              <th className="p-3 text-left font-medium">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {bySit.map((r) => (
              <tr key={r.situationId} className="border-t border-border">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.position}</td>
                <td className="p-3 tabular-nums">{(r.accuracy * 100).toFixed(1)}%</td>
                <td className="p-3 tabular-nums">{r.avgResponseMs.toFixed(0)} ms</td>
              </tr>
            ))}
            {!bySit.length && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Sem dados ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Piores mãos</h2>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {worst.map((w) => (
            <li key={w.label} className="flex justify-between gap-4 px-3 py-2 text-sm">
              <span className="font-mono text-foreground">{w.label}</span>
              <span className="tabular-nums text-primary">{w.count} erros</span>
            </li>
          ))}
          {!worst.length && (
            <li className="p-4 text-sm text-muted-foreground">Sem erros registrados.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
