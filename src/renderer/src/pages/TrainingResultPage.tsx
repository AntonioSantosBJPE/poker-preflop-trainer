import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { TrainingSummaryCards } from '@/components/training/TrainingSummaryCards';
import { useChartPalette } from '../hooks/useChartPalette';

export function TrainingResultPage(): ReactElement {
  const { sessionId } = useParams();
  const chart = useChartPalette();
  const [summary, setSummary] = useState<{
    totalHands: number;
    correct: number;
    accuracy: number;
  } | null>(null);
  const [bySit, setBySit] = useState<{ name: string; accuracy: number }[]>([]);

  useEffect(() => {
    void (async () => {
      const res = (await window.api.training.getSessionResult(Number(sessionId))) as {
        hands: { isCorrect: boolean; situationId: number }[];
      };
      const hands = res.hands;
      const correct = hands.filter((h) => h.isCorrect).length;
      const total = hands.length;
      setSummary({ totalHands: total, correct, accuracy: total ? correct / total : 0 });
      const map = new Map<number, { c: number; t: number }>();
      for (const h of hands) {
        const cur = map.get(h.situationId) ?? { c: 0, t: 0 };
        cur.t += 1;
        if (h.isCorrect) cur.c += 1;
        map.set(h.situationId, cur);
      }
      const rows: { name: string; accuracy: number }[] = [];
      for (const [sid, v] of map) {
        const s = (await window.api.situations.get(sid)) as { name: string };
        rows.push({ name: s.name, accuracy: v.t ? v.c / v.t : 0 });
      }
      setBySit(rows);
    })();
  }, [sessionId]);

  if (!summary) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Resultado da sessão" />
      <TrainingSummaryCards
        totalHands={summary.totalHands}
        correct={summary.correct}
        accuracy={summary.accuracy}
      />
      <div className="h-64 rounded-xl border border-border bg-card p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bySit}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: chart.tick, fontSize: 11 }}
              domain={[0, 1]}
            />
            <Tooltip formatter={(v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : v)} />
            <Bar dataKey="accuracy" fill={chart.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" asChild>
          <Link to={`/history/${sessionId}`}>Rever sessão</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/training">Nova sessão</Link>
        </Button>
        <Button variant="default" asChild>
          <Link to="/stats">Ver estatísticas</Link>
        </Button>
      </div>
    </div>
  );
}
