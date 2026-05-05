import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { SessionDetailDto } from '@shared/ipc/types';
import { EmptyState, PageHeader } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HandReviewCard } from '@/components/history/HandReviewCard';
import { SessionReviewHeader } from '@/components/history/SessionReviewHeader';

export function SessionHandReviewPage(): React.ReactElement {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<SessionDetailDto | null>(null);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = (location.state as { search?: string } | null)?.search ?? '';

  useEffect(() => {
    setLoading(true);
    setError(null);
    void window.api.training
      .getSessionDetail(Number(sessionId))
      .then((res) => {
        setDetail(res);
        setCurrentHandIndex(0);
      })
      .catch(() => {
        setDetail(null);
        setError('Sessão não encontrada');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const currentHand = detail?.hands[currentHandIndex] ?? null;
  const totalHands = detail?.hands.length ?? 0;
  const situationData = currentHand
    ? detail?.situationActionsMap[currentHand.situationId]
    : undefined;

  const goTo = (index: number) => {
    if (index >= 0 && index < totalHands) setCurrentHandIndex(index);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          title={error ?? 'Sessão não encontrada'}
          description="Volte ao histórico e escolha uma sessão disponível para revisão."
          action={
            <Button variant="outline" onClick={() => navigate(`/history${search}`)}>
              ← Voltar ao histórico
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revisão da sessão"
        description="Revise cada decisão com cartas, spot, resposta e range esperado lado a lado."
        backLink={{ to: `/history${search}`, label: '← Voltar ao histórico' }}
      />

      <SessionReviewHeader session={detail.session} />

      {currentHand && (
        <HandReviewCard
          hand={currentHand}
          situationData={situationData}
          handIndex={currentHandIndex}
          totalHands={totalHands}
          onPrev={() => goTo(currentHandIndex - 1)}
          onNext={() => goTo(currentHandIndex + 1)}
        />
      )}
    </div>
  );
}
