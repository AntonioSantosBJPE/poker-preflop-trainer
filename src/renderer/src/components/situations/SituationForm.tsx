import type { GroupSummaryDto } from '@shared/ipc/types';
import { POSITIONS } from '@shared/constants';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { SituationEditorFormValues } from '@shared/forms/situationSchemas';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface SituationFormProps {
  register: UseFormRegister<SituationEditorFormValues>;
  errors: FieldErrors<SituationEditorFormValues>;
  groups: GroupSummaryDto[];
}

export function SituationForm({
  register,
  errors,
  groups,
}: SituationFormProps): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1 md:col-span-2">
        <Label htmlFor="situation-name">Nome</Label>
        <Input
          id="situation-name"
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="situation-group">Grupo</Label>
        <select
          id="situation-group"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
          data-testid="situation-group-select"
          aria-invalid={errors.groupId ? true : undefined}
          {...register('groupId', {
            setValueAs: (value) => {
              if (value === '' || value === undefined || value === null) return 0;
              const parsed = Number(value);
              return Number.isNaN(parsed) ? 0 : parsed;
            },
          })}
        >
          <option value="">Selecione um grupo…</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {errors.groupId && (
          <p
            className="text-sm text-destructive"
            role="alert"
            data-testid="situation-group-error"
          >
            {errors.groupId.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="situation-position">Posição</Label>
        <select
          id="situation-position"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          {...register('position')}
        >
          {POSITIONS.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="situation-stack">Stack efetivo (BB)</Label>
        <Input
          id="situation-stack"
          type="number"
          min={10}
          max={500}
          aria-invalid={errors.effectiveStack ? true : undefined}
          {...register('effectiveStack', { valueAsNumber: true })}
        />
        {errors.effectiveStack && (
          <p className="text-sm text-destructive" role="alert">
            {errors.effectiveStack.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 md:col-span-2">
        <Label htmlFor="situation-description">Descrição</Label>
        <Textarea id="situation-description" {...register('description')} />
      </div>
    </div>
  );
}
