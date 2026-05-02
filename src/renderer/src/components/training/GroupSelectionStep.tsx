import { Link } from 'react-router-dom';
import type { GroupSummaryDto } from '@shared/ipc/types';

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
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <button
          key={g.id}
          type="button"
          data-testid={`${testIdPrefix}-group-${g.id}`}
          className="flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
          onClick={() => onSelectGroup(g)}
        >
          <span className="font-medium text-foreground">{g.name}</span>
          <span className="text-xs text-muted-foreground">{g.situationCount} situações</span>
        </button>
      ))}
      {!groups.length && (
        <p className="col-span-2 text-sm text-muted-foreground">
          Sem grupos.{' '}
          <Link to="/groups" className="text-primary hover:underline">
            Criar grupo primeiro.
          </Link>
        </p>
      )}
    </div>
  );
}
