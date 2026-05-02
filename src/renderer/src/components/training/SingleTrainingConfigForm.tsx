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

type Sit = { id: number; name: string };

export function SingleTrainingConfigForm(): React.ReactElement {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [sits, setSits] = useState<Sit[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<TrainingStartFormValues>({
    resolver: zodResolver(trainingStartFormSchema),
    defaultValues: {
      groupId: 1,
      situationIds: [],
      totalHands: 25,
      timerSeconds: 0,
      feedbackMode: 'IMMEDIATE',
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
      <div className="max-w-xl space-y-6" data-testid="training-step-1">
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
    <div className="max-w-xl space-y-6" data-testid="training-step-2">
      <PageHeader
        title="Configurar treino"
        actions={
          <button
            type="button"
            data-testid="training-back-btn"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={handleBack}
          >
            Voltar
          </button>
        }
      />
      <form className="space-y-6" onSubmit={(e) => void handleSubmit(onValid)(e)} noValidate>
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
