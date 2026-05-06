import { Link } from 'react-router-dom';
import type { GroupSummaryDto } from '@shared/ipc/types';
import { SectionCard } from '@/components/app/SectionCard';

export interface GroupSelectionStepProps {
  groups: GroupSummaryDto[];
  onSelectGroup: (group: GroupSummaryDto) => void;
  testIdPrefix?: string;
}

export function GroupSelectionStep({
  groups,
  onSelectGroup,
  testIdPrefix = 'training',
}: GroupSelectionStepProps): React.ReactElement {
  return (
    <SectionCard
      title="Biblioteca de treino"
      description="Escolha o bloco de spots que define o escopo da sessão."
      contentClassName="gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-label={g.name}
            data-testid={`${testIdPrefix}-group-${g.id}`}
            className="group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-border bg-card/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/70 hover:bg-accent/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => onSelectGroup(g)}
          >
            <span className="flex w-full items-start justify-between gap-3">
              <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                {g.name}
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Grupo
              </span>
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {g.situationCount} situações
            </span>
          </button>
        ))}
        {!groups.length && (
          <div className="col-span-2 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
            Sem grupos.{' '}
            <Link to="/groups" className="font-medium text-primary hover:underline">
              Criar grupo primeiro.
            </Link>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
