import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, UseFormRegisterReturn } from 'react-hook-form';
import type { TrainingStartFormValues } from '@shared/forms/trainingSchemas';
import { FormNumberField } from '@/components/forms/FormNumberField';
import { FormSelectField } from '@/components/forms/FormSelectField';

const FEEDBACK_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Imediato' },
  { value: 'END_OF_SESSION', label: 'Ao final' },
];

export interface SessionSettingsFormProps {
  control: Control<TrainingStartFormValues>;
  errors: FieldErrors<TrainingStartFormValues>;
  registerTotalHands: UseFormRegisterReturn;
  registerTimerSeconds: UseFormRegisterReturn;
  totalHandsLabel?: string;
}

export function SessionSettingsForm({
  control,
  errors,
  registerTotalHands,
  registerTimerSeconds,
  totalHandsLabel = 'Número de mãos',
}: SessionSettingsFormProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <FormNumberField
        id="training-total-hands"
        label={totalHandsLabel}
        register={registerTotalHands}
        min={1}
        error={errors.totalHands?.message}
      />
      <FormNumberField
        id="training-timer"
        label="Timer (s, 0 = desligado)"
        register={registerTimerSeconds}
        min={0}
        error={errors.timerSeconds?.message}
      />
      <Controller
        control={control}
        name="feedbackMode"
        render={({ field }) => (
          <FormSelectField
            id="training-feedback"
            label="Feedback"
            value={field.value}
            onValueChange={field.onChange}
            options={FEEDBACK_OPTIONS}
            error={errors.feedbackMode?.message}
          />
        )}
      />
    </div>
  );
}
