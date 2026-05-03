import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { MultiSessionDetailDto } from '@shared/ipc/types';
import { PageHeader } from '@/components/app';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HandReviewCard } from '@/components/history/HandReviewCard';
import { MultiSessionReviewHeader } from '@/components/history/MultiSessionReviewHeader';

export function MultiSessionReviewPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<MultiSessionDetailDto | null>(null);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = (location.state as { search?: string } | null)?.search ?? '';
  const idsRaw = searchParams.get('ids') ?? '';
  const ids = idsRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => !Number.isNaN(n));

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      setError('Nenhuma sessão selecionada.');
      return;
    }

    if (ids.length === 1) {
      navigate(`/history/${ids[0]}`, { replace: true });
      return;
    }

    setLoading(true);
    setError(null);
    void window.api.training
      .getMultiSessionDetail({ ids })
      .then((res) => {
        setDetail(res);
        setCurrentHandIndex(0);
      })
      .catch(() => {
        setDetail(null);
        setError('Erro ao carregar sessões.');
      })
      .finally(() => setLoading(false));
  }, [idsRaw]);

  const totalHands = detail?.hands.length ?? 0;
  const correct = detail ? detail.hands.filter((h) => h.isCorrect).length : 0;
  const accuracy = totalHands > 0 ? correct / totalHands : 0;
  const totalDurationMs = detail
    ? detail.sessions.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)
    : 0;

  const currentHand = detail?.hands[currentHandIndex] ?? null;
  const currentSessionInfo = currentHand ? detail?.handSessionMap[currentHandIndex] : null;
  const currentSession = currentSessionInfo
    ? detail?.sessions[currentSessionInfo.sessionIndex]
    : null;
  const situationData = currentHand
    ? detail?.situationActionsMap[currentHand.situationId]
    : undefined;

  const goTo = (index: number) => {
    if (index >= 0 && index < totalHands) setCurrentHandIndex(index);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6" data-testid="multi-session-review-page">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-16"
        data-testid="multi-session-error"
      >
        <p className="text-lg font-semibold text-foreground">
          {error ?? 'Erro ao carregar sessões.'}
        </p>
        <Button variant="outline" onClick={() => navigate(`/history${search}`)}>
          ← Voltar ao histórico
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="multi-session-review-page">
      <PageHeader
        title="Revisão Múltipla"
        backLink={{ to: `/history${search}`, label: '← Voltar ao histórico' }}
      />

      <MultiSessionReviewHeader
        sessions={detail.sessions}
        totalHands={totalHands}
        accuracy={accuracy}
        totalDurationMs={totalDurationMs}
      />

      {detail.omittedIds && detail.omittedIds.length > 0 && (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          data-testid="multi-session-omitted-warning"
        >
          {detail.omittedIds.length}{' '}
          {detail.omittedIds.length === 1
            ? 'sessão não está disponível.'
            : 'sessões não estão disponíveis.'}
        </div>
      )}

      {currentHand && currentSessionInfo && currentSession && (
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit" data-testid="multi-session-badge">
            Sessão {currentSessionInfo.sessionIndex + 1} —{' '}
            {new Date(currentSession.startedAt).toLocaleDateString('pt-BR')}
          </Badge>
          <HandReviewCard
            hand={currentHand}
            situationData={situationData}
            handIndex={currentHandIndex}
            totalHands={totalHands}
            onPrev={() => goTo(currentHandIndex - 1)}
            onNext={() => goTo(currentHandIndex + 1)}
          />
        </div>
      )}
    </div>
  );
}
