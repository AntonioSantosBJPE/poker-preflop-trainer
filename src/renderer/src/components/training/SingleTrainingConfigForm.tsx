import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  trainingStartFormSchema,
  type TrainingStartFormValues,
} from '@shared/forms/trainingSchemas';
import type { GroupSummaryDto } from '@shared/ipc/types';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { GroupSelectionStep } from '@/components/training/GroupSelectionStep';
import { SituationChecklist } from '@/components/training/SituationChecklist';
import { SessionSettingsForm } from '@/components/training/SessionSettingsForm';
import { DEFAULT_USER_PREFERENCES } from '@shared/constants';
import { usePreferencesStore } from '@/stores/preferences';

type Sit = { id: number; name: string };

export function SingleTrainingConfigForm(): React.ReactElement {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [sits, setSits] = useState<Sit[]>([]);
  const rawPreferences = usePreferencesStore((s) => s.raw);
  const preferencesReady = usePreferencesStore((s) => s.ready);

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
  } = useForm<TrainingStartFormValues>({
    resolver: zodResolver(trainingStartFormSchema),
    defaultValues: {
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
    dirtyFields.timerSeconds,
    dirtyFields.totalHands,
    preferencesReady,
    preferredFeedbackMode,
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

  async function onValid(data: TrainingStartFormValues): Promise<void> {
    const sessionId = await window.api.training.startSession({
      groupId: data.groupId,
      situationIds: data.situationIds,
      totalHands: data.totalHands,
      timerSeconds: data.timerSeconds,
      feedbackMode: data.feedbackMode,
    });
    navigate(`/training/${sessionId}`, {
      state: {
        totalHands: data.totalHands,
        timerSeconds: data.timerSeconds,
        feedbackMode: data.feedbackMode,
      },
    });
  }

  if (step === 1) {
    return (
      <div className="flex flex-col gap-6" data-testid="training-step-1">
        <PageHeader title="Configurar treino" description="Escolha um grupo" />
        <GroupSelectionStep
          groups={groups}
          onSelectGroup={(g) => void handleSelectGroup(g)}
          testIdPrefix="training"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="training-step-2">
      <PageHeader
        title="Configurar treino"
        actions={
          <Button
            type="button"
            variant="outline"
            data-testid="training-back-btn"
            onClick={handleBack}
          >
            Voltar
          </Button>
        }
      />
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => void handleSubmit(onValid)(e)}
        noValidate
      >
        <SituationChecklist
          situations={sits}
          selected={situationIds}
          onToggle={toggleSituation}
          onSelectAll={selectAllSituations}
          error={errors.situationIds?.message}
          testIdPrefix="training"
        />
        <SessionSettingsForm
          control={control}
          errors={errors}
          registerTotalHands={register('totalHands', { valueAsNumber: true })}
          registerTimerSeconds={register('timerSeconds', { valueAsNumber: true })}
        />
        <Button type="submit" disabled={!situationIds.length} className="w-full py-3">
          Iniciar
        </Button>
      </form>
    </div>
  );
}
