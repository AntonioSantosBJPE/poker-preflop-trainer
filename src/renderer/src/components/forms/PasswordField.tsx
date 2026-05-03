import type { UseFormRegisterReturn } from 'react-hook-form';
import { FieldError } from '@/components/forms/FieldError';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

export interface PasswordFieldProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PasswordField({
  id,
  label,
  register,
  error,
  disabled,
  placeholder,
}: PasswordFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
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
