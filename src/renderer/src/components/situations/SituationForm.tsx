import type { GroupSummaryDto } from '@shared/ipc/types';
import { POSITIONS } from '@shared/constants';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import type { SituationEditorFormValues } from '@shared/forms/situationSchemas';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SituationFormProps {
  register: UseFormRegister<SituationEditorFormValues>;
  control: Control<SituationEditorFormValues>;
  errors: FieldErrors<SituationEditorFormValues>;
  groups: GroupSummaryDto[];
}

export function SituationForm({
  register,
  control,
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
        <Controller
          control={control}
          name="groupId"
          render={({ field }) => (
            <Select
              key={groups.length}
              value={field.value === 0 ? '' : String(field.value)}
              onValueChange={(val) => field.onChange(val === '' ? 0 : Number(val))}
            >
              <SelectTrigger
                id="situation-group"
                data-testid="situation-group-select"
                className="w-full"
                aria-invalid={errors.groupId ? true : undefined}
              >
                <SelectValue placeholder="Selecione um grupo…" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.groupId && (
          <p className="text-sm text-destructive" role="alert" data-testid="situation-group-error">
            {errors.groupId.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="situation-position">Posição</Label>
        <Controller
          control={control}
          name="position"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="situation-position" className="w-full">
                <SelectValue placeholder="Selecione uma posição…" />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
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
