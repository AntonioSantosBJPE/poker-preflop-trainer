import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { TrainingSummaryCards } from '@/components/training/TrainingSummaryCards';
import { Button } from '@/components/ui/button';

type SessionResult = {
  session: { id: number };
  hands: { isCorrect: boolean }[];
};

type TableSummary = {
  sessionId: number;
  total: number;
  correct: number;
  accuracyPct: number;
};

export function SimultaneousTrainingSummaryPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { sessionIds: number[] } };
  const sessionIds = location.state?.sessionIds ?? [];
  const [tables, setTables] = useState<TableSummary[]>([]);

  useEffect(() => {
    if (!sessionIds.length) {
      navigate('/training/simultaneous', { replace: true });
      return;
    }
    void (async () => {
      const results = (await Promise.all(
        sessionIds.map((sessionId) => window.api.training.getSessionResult(sessionId)),
      )) as SessionResult[];
      const tableSummaries = results.map((result) => {
        const total = result.hands.length;
        const correct = result.hands.filter((h) => h.isCorrect).length;
        return {
          sessionId: result.session.id,
          total,
          correct,
          accuracyPct: total ? Math.round((correct / total) * 100) : 0,
        };
      });
      setTables(tableSummaries);
    })();
  }, [navigate, sessionIds]);

  const totalHands = tables.reduce((sum, table) => sum + table.total, 0);
  const totalCorrect = tables.reduce((sum, table) => sum + table.correct, 0);
  const accuracyDecimal = totalHands ? totalCorrect / totalHands : 0;
  const totalMistakes = totalHands - totalCorrect;
  const bestTable = tables.reduce<TableSummary | null>(
    (best, table) => (!best || table.accuracyPct > best.accuracyPct ? table : best),
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resumo do treino simultâneo"
        description="Resultado agregado primeiro, depois leitura por mesa."
      />
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col gap-5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Agregado multi-mesa
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <span className="font-display text-5xl font-semibold text-foreground">
                {(accuracyDecimal * 100).toFixed(1)}%
              </span>
              <span className="pb-2 text-sm text-muted-foreground">de acerto total</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary">
                {totalCorrect} acertos
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                {totalMistakes} erros
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                {tables.length} mesas
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Destaque
            </span>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {bestTable ? `${bestTable.accuracyPct}% na melhor mesa` : 'Carregando mesas'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Use a revisão múltipla para comparar padrões entre mesas.
            </p>
          </div>
        </div>
      </section>
      <TrainingSummaryCards
        totalHands={totalHands}
        correct={totalCorrect}
        accuracy={accuracyDecimal}
      />
      <SectionCard
        title="Quebra por mesa"
        description="Compare consistência entre janelas antes de decidir o próximo treino."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {tables.map((table, index) => (
            <div
              key={table.sessionId}
              className="rounded-2xl border border-border bg-background/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Mesa {index + 1}</p>
                  <p className="text-sm text-muted-foreground">
                    {table.correct}/{table.total} acertos ({table.accuracyPct}%)
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {table.accuracyPct}%
                </span>
              </div>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <Link to={`/history/${table.sessionId}`}>Revisão da sessão</Link>
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard
        title="Próximo passo"
        description="Revise o agregado ou comece uma nova bateria."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="default" asChild>
            <Link to={`/history/review-multi?ids=${sessionIds.join(',')}`}>Revisão múltipla</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/training/simultaneous">Novo treino simultâneo</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/training">Treino normal</Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
