export interface FieldErrorProps {
  message?: string;
  testId?: string;
}

export function FieldError({ message, testId }: FieldErrorProps): React.ReactElement | null {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert" data-testid={testId}>
      {message}
    </p>
  );
}
