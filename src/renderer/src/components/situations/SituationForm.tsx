import type { GroupSummaryDto } from '@shared/ipc/types';
import { POSITIONS } from '@shared/constants';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { SituationEditorFormValues } from '@shared/forms/situationSchemas';

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
      <label className="block md:col-span-2" htmlFor="situation-name">
        <span className="pt-label">Nome</span>
        <input
          id="situation-name"
          className="pt-input"
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </label>
      <label className="block" htmlFor="situation-group">
        <span className="pt-label">Grupo</span>
        <select
          id="situation-group"
          className="pt-input"
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
            className="mt-1 text-sm text-destructive"
            role="alert"
            data-testid="situation-group-error"
          >
            {errors.groupId.message}
          </p>
        )}
      </label>
      <label className="block" htmlFor="situation-position">
        <span className="pt-label">Posição</span>
        <select id="situation-position" className="pt-input" {...register('position')}>
          {POSITIONS.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      </label>
      <label className="block" htmlFor="situation-stack">
        <span className="pt-label">Stack efetivo (BB)</span>
        <input
          id="situation-stack"
          type="number"
          min={10}
          max={500}
          className="pt-input"
          aria-invalid={errors.effectiveStack ? true : undefined}
          {...register('effectiveStack', { valueAsNumber: true })}
        />
        {errors.effectiveStack && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {errors.effectiveStack.message}
          </p>
        )}
      </label>
      <label className="block md:col-span-2" htmlFor="situation-description">
        <span className="pt-label">Descrição</span>
        <textarea
          id="situation-description"
          className="pt-input min-h-18"
          {...register('description')}
        />
      </label>
    </div>
  );
}
