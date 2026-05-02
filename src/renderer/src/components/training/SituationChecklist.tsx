import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FieldError } from '@/components/forms/FieldError';

type Sit = { id: number; name: string };

export interface SituationChecklistProps {
  situations: Sit[];
  selected: number[];
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  error?: string;
  testIdPrefix?: string;
}

export function SituationChecklist({
  situations,
  selected,
  onToggle,
  onSelectAll,
  error,
  testIdPrefix = 'training',
}: SituationChecklistProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium leading-none text-foreground">Situações</span>
        <button
          type="button"
          data-testid={`${testIdPrefix}-select-all-btn`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
          disabled={!situations.length}
          onClick={onSelectAll}
        >
          Selecionar todas
        </button>
      </div>
      <ScrollArea className="h-56 rounded-xl border border-border">
        <div className="divide-y divide-border">
          {situations.map((s) => (
            <label
              key={s.id}
              htmlFor={`${testIdPrefix}-sit-${s.id}`}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/60"
            >
              <Checkbox
                id={`${testIdPrefix}-sit-${s.id}`}
                checked={selected.includes(s.id)}
                onCheckedChange={() => onToggle(s.id)}
              />
              <span className="text-sm">{s.name}</span>
            </label>
          ))}
          {!situations.length && (
            <p className="p-4 text-sm text-muted-foreground">Cadastre situações antes.</p>
          )}
        </div>
      </ScrollArea>
      <FieldError message={error} />
    </div>
  );
}
