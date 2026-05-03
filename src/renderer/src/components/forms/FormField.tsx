import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/forms/FieldError';

export interface FormFieldProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
}

export function FormField({
  id,
  label,
  register,
  error,
  disabled,
  placeholder,
  type = 'text',
}: FormFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...register}
      />
      <FieldError message={error} />
    </div>
  );
}
