import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  simultaneousTrainingStartSchema,
  type SimultaneousTrainingStartFormInput,
  type SimultaneousTrainingStartInput,
  type TrainingStartFormValues,
} from '@shared/forms/trainingSchemas';
import { DEFAULT_USER_PREFERENCES } from '@shared/constants';
import type { GroupSummaryDto } from '@shared/ipc/types';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { FormSelectField } from '@/components/forms/FormSelectField';
import { GroupSelectionStep } from '@/components/training/GroupSelectionStep';
import { SituationChecklist } from '@/components/training/SituationChecklist';
import { SessionSettingsForm } from '@/components/training/SessionSettingsForm';
import { usePreferencesStore } from '@/stores/preferences';

type Sit = { id: number; name: string };

const TABLE_COUNT_OPTIONS = [
  { value: '2', label: '2 mesas' },
  { value: '3', label: '3 mesas' },
  { value: '4', label: '4 mesas' },
];

export function SimultaneousTrainingConfigForm(): React.ReactElement {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [sits, setSits] = useState<Sit[]>([]);
  const rawPreferences = usePreferencesStore((s) => s.raw);
  const preferencesReady = usePreferencesStore((s) => s.ready);

  const preferredTableCount =
    rawPreferences?.defaultSimultaneousTableCount ??
    DEFAULT_USER_PREFERENCES.defaultSimultaneousTableCount;
  const preferredTotalHands =
    rawPreferences?.defaultTrainingTotalHands ?? DEFAULT_USER_PREFERENCES.defaultTrainingTotalHands;
  const preferredTimerSeconds =
    rawPreferences?.defaultTrainingTimerSeconds ??
    DEFAULT_USER_PREFERENCES.defaultTrainingTimerSeconds;
  const preferredFeedbackMode =
    rawPreferences?.defaultTrainingFeedbackMode ??
    DEFAULT_USER_PREFERENCES.defaultTrainingFeedbackMode;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    formState: { errors, dirtyFields },
  } = useForm<SimultaneousTrainingStartFormInput, unknown, SimultaneousTrainingStartInput>({
    resolver: zodResolver(simultaneousTrainingStartSchema),
    defaultValues: {
      tableCount: preferredTableCount,
      groupId: 1,
      situationIds: [],
      totalHands: preferredTotalHands,
      timerSeconds: preferredTimerSeconds,
      feedbackMode: preferredFeedbackMode,
    },
    mode: 'onSubmit',
  });

  const situationIds = watch('situationIds');

  useEffect(() => {
    void (async () => {
      const list = (await window.api.groups.list()) as GroupSummaryDto[];
      setGroups(list);
    })();
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    if (!dirtyFields.tableCount) {
      setValue('tableCount', preferredTableCount, { shouldDirty: false, shouldValidate: false });
    }
    if (!dirtyFields.totalHands) {
      setValue('totalHands', preferredTotalHands, { shouldDirty: false, shouldValidate: false });
    }
    if (!dirtyFields.timerSeconds) {
      setValue('timerSeconds', preferredTimerSeconds, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    if (!dirtyFields.feedbackMode) {
      setValue('feedbackMode', preferredFeedbackMode, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [
    dirtyFields.feedbackMode,
    dirtyFields.tableCount,
    dirtyFields.timerSeconds,
    dirtyFields.totalHands,
    preferencesReady,
    preferredFeedbackMode,
    preferredTableCount,
    preferredTimerSeconds,
    preferredTotalHands,
    setValue,
  ]);

  async function handleSelectGroup(group: GroupSummaryDto): Promise<void> {
    setValue('groupId', group.id, { shouldValidate: false });
    const list = (await window.api.situations.list({ groupId: group.id })) as Sit[];
    setSits(list);
    setStep(2);
  }

  function handleBack(): void {
    setStep(1);
    setValue('situationIds', [], { shouldValidate: false, shouldDirty: true });
  }

  function toggleSituation(id: number): void {
    const cur = getValues('situationIds');
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setValue('situationIds', next, { shouldValidate: true, shouldDirty: true });
  }

  function selectAllSituations(): void {
    setValue(
      'situationIds',
      sits.map((s) => s.id),
      { shouldValidate: true, shouldDirty: true },
    );
  }

  async function onValid(data: SimultaneousTrainingStartInput): Promise<void> {
    const { sessionIds } = await window.api.simultaneousTraining.startSession(data);
    navigate('/training/simultaneous/session', {
      state: {
        sessionIds,
        totalHands: data.totalHands,
        timerSeconds: data.timerSeconds,
        feedbackMode: data.feedbackMode,
      },
    });
  }

  if (step === 1) {
    return (
      <div className="max-w-xl space-y-6" data-testid="sim-training-step-1">
        <PageHeader title="Treino simultâneo" description="Escolha um grupo" />
        <GroupSelectionStep
          groups={groups}
          onSelectGroup={(g) => void handleSelectGroup(g)}
          testIdPrefix="sim-training"
        />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6" data-testid="sim-training-step-2">
      <PageHeader
        title="Configurar treino simultâneo"
        actions={
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={handleBack}
          >
            Voltar
          </button>
        }
      />
      <form className="space-y-6" onSubmit={(e) => void handleSubmit(onValid)(e)} noValidate>
        <Controller
          control={control}
          name="tableCount"
          render={({ field }) => (
            <FormSelectField
              id="sim-training-table-count"
              label="Mesas simultâneas"
              value={String(field.value)}
              onValueChange={(v) => field.onChange(Number(v))}
              options={TABLE_COUNT_OPTIONS}
              error={errors.tableCount?.message}
            />
          )}
        />
        <SituationChecklist
          situations={sits}
          selected={situationIds}
          onToggle={toggleSituation}
          onSelectAll={selectAllSituations}
          error={errors.situationIds?.message}
          testIdPrefix="sim-training"
        />
        <SessionSettingsForm
          control={control as unknown as Control<TrainingStartFormValues>}
          errors={errors as FieldErrors<TrainingStartFormValues>}
          registerTotalHands={register('totalHands', { valueAsNumber: true })}
          registerTimerSeconds={register('timerSeconds', { valueAsNumber: true })}
          totalHandsLabel="Número de mãos por mesa"
        />
        <Button type="submit" disabled={!situationIds.length} className="w-full py-3">
          Iniciar treino simultâneo
        </Button>
      </form>
    </div>
  );
}
