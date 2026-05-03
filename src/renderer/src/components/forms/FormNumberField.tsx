import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/forms/FieldError';

export interface FormNumberFieldProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  min?: number;
  step?: number;
  error?: string;
  disabled?: boolean;
}

export function FormNumberField({
  id,
  label,
  register,
  min,
  step,
  error,
  disabled,
}: FormNumberFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        step={step}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...register}
      />
      <FieldError message={error} />
    </div>
  );
}
