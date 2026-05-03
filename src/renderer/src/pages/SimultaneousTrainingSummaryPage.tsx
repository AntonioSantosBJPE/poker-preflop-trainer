import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
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

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Resumo do treino simultâneo" />
      <TrainingSummaryCards
        totalHands={totalHands}
        correct={totalCorrect}
        accuracy={accuracyDecimal}
      />
      <div className="space-y-3">
        {tables.map((table, index) => (
          <div key={table.sessionId} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium text-foreground">Mesa {index + 1}</p>
            <p className="text-sm text-muted-foreground">
              {table.correct}/{table.total} acertos ({table.accuracyPct}%)
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link to={`/history/${table.sessionId}`}>Revisão individual</Link>
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" asChild>
          <Link to={`/history/review-multi?ids=${sessionIds.join(',')}`}>Revisão múltipla</Link>
        </Button>
        <Button asChild>
          <Link to="/training/simultaneous">Novo treino simultâneo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/training">Treino normal</Link>
        </Button>
      </div>
    </div>
  );
}
