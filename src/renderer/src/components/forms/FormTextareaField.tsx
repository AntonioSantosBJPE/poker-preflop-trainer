import type { UseFormRegisterReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/forms/FieldError';

export interface FormTextareaFieldProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function FormTextareaField({
  id,
  label,
  register,
  error,
  disabled,
  placeholder,
}: FormTextareaFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...register}
      />
      <FieldError message={error} />
    </div>
  );
}
