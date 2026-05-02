import { ACTION_TYPES } from '@shared/constants';
import type { FieldErrors, UseFormGetValues, UseFormRegister } from 'react-hook-form';
import type { FieldArrayWithId } from 'react-hook-form';
import type { SituationEditorFormValues } from '@shared/forms/situationSchemas';

type SituationActionField = FieldArrayWithId<SituationEditorFormValues, 'actions', 'id'>;

export interface SituationActionsEditorProps {
  fields: SituationActionField[];
  register: UseFormRegister<SituationEditorFormValues>;
  getValues: UseFormGetValues<SituationEditorFormValues>;
  errors: FieldErrors<SituationEditorFormValues>;
  activeActionKey: string;
  actionCombos: Map<string, number>;
  totalCombos: number;
  onSetActiveAction: (clientKey: string) => void;
  onClearAll: () => void;
  onAddAction: () => void;
  onClearAction: (clientKey: string) => void;
  onRemoveAt: (index: number) => void;
}

export function SituationActionsEditor({
  fields,
  register,
  getValues,
  errors,
  activeActionKey,
  actionCombos,
  totalCombos,
  onSetActiveAction,
  onClearAll,
  onAddAction,
  onClearAction,
  onRemoveAt,
}: SituationActionsEditorProps): React.ReactElement {
  return (
    <div
      className="space-y-3 rounded-xl border border-border bg-card p-4"
      data-testid="situation-actions-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">Ações</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            Range total: {((totalCombos / 1326) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={onClearAll}
          >
            Limpar tudo
          </button>
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={onAddAction}
          >
            + Adicionar
          </button>
        </div>
      </div>
      {errors.actions && typeof errors.actions === 'object' && 'message' in errors.actions && (
        <p className="text-sm text-destructive" role="alert">
          {(errors.actions as { message?: string }).message}
        </p>
      )}
      <div className="space-y-2">
        {fields.map((field, index) => {
          const clientKey = getValues(`actions.${index}.clientKey`);
          const isActive = clientKey === activeActionKey;
          const combos = actionCombos.get(clientKey) ?? 0;
          const percentage = ((combos / 1326) * 100).toFixed(1);
          return (
            <div
              key={field.id}
              data-testid="situation-action-row"
              className={[
                'flex flex-wrap items-center gap-2 rounded-lg p-2 transition-colors',
                isActive
                  ? 'border-2 border-primary/40 bg-muted'
                  : 'border border-border bg-muted/40',
              ].join(' ')}
            >
              <input
                className="pt-input mt-0 min-w-30 flex-1 py-1 text-sm"
                aria-invalid={errors.actions?.[index]?.name ? true : undefined}
                {...register(`actions.${index}.name`)}
              />
              <input type="hidden" {...register(`actions.${index}.clientKey`)} />
              <select
                className="pt-input mt-0 w-auto py-1 text-sm"
                {...register(`actions.${index}.actionType`)}
              >
                {ACTION_TYPES.map((actionType) => (
                  <option key={actionType} value={actionType}>
                    {actionType}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.1"
                placeholder="BB"
                className="pt-input mt-0 w-24 py-1 text-sm"
                aria-invalid={errors.actions?.[index]?.sizeBb ? true : undefined}
                {...register(`actions.${index}.sizeBb`, {
                  setValueAs: (value) => {
                    if (value === '' || value === undefined || value === null) return null;
                    const parsed = Number(value);
                    return Number.isNaN(parsed) ? null : parsed;
                  },
                })}
              />
              <input
                type="color"
                className="h-8 w-10 border-0 bg-transparent"
                {...register(`actions.${index}.colorHex`)}
              />
              <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                {percentage}%
              </span>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => onSetActiveAction(clientKey)}
              >
                Pintar
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onClearAction(clientKey)}
              >
                Limpar
              </button>
              <button
                type="button"
                className="text-xs text-destructive hover:underline"
                onClick={() => onRemoveAt(index)}
              >
                Remover
              </button>
              {(errors.actions?.[index]?.name ||
                errors.actions?.[index]?.actionType ||
                errors.actions?.[index]?.sizeBb) && (
                <p className="w-full text-xs text-destructive" role="alert">
                  {errors.actions?.[index]?.name?.message ??
                    errors.actions?.[index]?.actionType?.message ??
                    errors.actions?.[index]?.sizeBb?.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
