import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrainingSummaryCards } from '@/components/training/TrainingSummaryCards';
import { useChartPalette } from '../hooks/useChartPalette';

function resultTone(accuracy: number): { title: string; description: string } {
  if (accuracy >= 0.8) {
    return {
      title: 'Sessão forte',
      description: 'Priorize revisão pontual e mantenha este bloco no ciclo de manutenção.',
    };
  }
  if (accuracy >= 0.6) {
    return {
      title: 'Base em evolução',
      description: 'Revise os erros antes de aumentar volume ou misturar novos spots.',
    };
  }
  return {
    title: 'Bloco para reforço',
    description: 'Use a revisão da sessão para identificar padrões antes do próximo treino.',
  };
}

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

  if (!summary)
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  const mistakes = summary.totalHands - summary.correct;
  const accuracyPct = (summary.accuracy * 100).toFixed(1);
  const tone = resultTone(summary.accuracy);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resultado da sessão"
        description="Fechamento do bloco de estudo com próximos passos claros."
      />
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Score da sessão
              </span>
              <div className="flex flex-wrap items-end gap-3">
                <span className="font-display text-5xl font-semibold text-foreground">
                  {accuracyPct}%
                </span>
                <span className="pb-2 text-sm text-muted-foreground">de acerto</span>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">{tone.description}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary">
                {summary.correct} acertos
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                {mistakes} erros
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                {summary.totalHands} mãos
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Leitura
            </span>
            <p className="mt-3 text-lg font-semibold text-foreground">{tone.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Melhor próximo passo: revisar mãos antes de abrir uma nova sessão.
            </p>
          </div>
        </div>
      </section>
      <TrainingSummaryCards
        totalHands={summary.totalHands}
        correct={summary.correct}
        accuracy={summary.accuracy}
      />
      <SectionCard
        title="Desempenho por situação"
        description="Compare rapidamente quais spots puxaram o resultado para cima ou para baixo."
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySit}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: chart.tick, fontSize: 11 }}
                domain={[0, 1]}
              />
              <Tooltip
                formatter={(v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : v)}
              />
              <Bar dataKey="accuracy" fill={chart.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
      <SectionCard
        title="Próximo passo"
        description="Feche o ciclo de aprendizado com revisão ou comece outro bloco."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="default" asChild>
            <Link to={`/history/${sessionId}`}>Revisão da sessão</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/training">Nova sessão</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/stats">Ver estatísticas</Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
