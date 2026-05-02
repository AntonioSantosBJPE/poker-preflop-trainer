import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export interface ToggleOption {
  value: string;
  label: string;
}

export interface ToggleOptionGroupProps {
  value: string;
  options: ToggleOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function ToggleOptionGroup({
  value,
  options,
  onValueChange,
  disabled,
  ariaLabel,
}: ToggleOptionGroupProps): React.ReactElement {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
