import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { GroupSummaryDto } from '@shared/ipc/types';
import {
  trainingStartFormSchema,
  type TrainingStartFormValues,
} from '@shared/forms/trainingSchemas';

type Sit = { id: number; name: string };

export function TrainingConfigPage(): React.ReactElement {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [sits, setSits] = useState<Sit[]>([]);

  const {
    register,
    handleSubmit,
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
    const allIds = sits.map((s) => s.id);
    setValue('situationIds', allIds, { shouldValidate: true, shouldDirty: true });
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
        <h1 className="pt-page-title">Configurar treino</h1>
        <p className="pt-label">Escolha um grupo</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              data-testid={`training-group-${g.id}`}
              className="pt-card flex cursor-pointer flex-col items-start gap-1 p-4 text-left transition-colors hover:border-primary"
              onClick={() => void handleSelectGroup(g)}
            >
              <span className="font-medium text-foreground">{g.name}</span>
              <span className="text-xs text-muted-foreground">{g.situationCount} situações</span>
            </button>
          ))}
          {!groups.length && (
            <p className="col-span-2 text-sm text-muted-foreground">
              Sem grupos.{' '}
              <Link to="/groups" className="text-primary hover:underline">
                Criar grupo primeiro.
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6" data-testid="training-step-2">
      <button
        type="button"
        data-testid="training-back-btn"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        onClick={handleBack}
      >
        Voltar
      </button>
      <form className="space-y-6" onSubmit={(e) => void handleSubmit(onValid)(e)} noValidate>
        <h1 className="pt-page-title">Configurar treino</h1>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="pt-label">Situações</p>
            <button
              type="button"
              data-testid="training-select-all-btn"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
              disabled={!sits.length}
              onClick={selectAllSituations}
            >
              Selecionar todas
            </button>
          </div>
          <div className="max-h-56 divide-y divide-border overflow-auto rounded-xl border border-border">
            {sits.map((s) => (
              <label
                key={s.id}
                htmlFor={`training-sit-${s.id}`}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/60"
              >
                <input
                  id={`training-sit-${s.id}`}
                  type="checkbox"
                  checked={situationIds.includes(s.id)}
                  onChange={() => toggleSituation(s.id)}
                />
                <span>{s.name}</span>
              </label>
            ))}
            {!sits.length && (
              <p className="p-4 text-sm text-muted-foreground">Cadastre situações antes.</p>
            )}
          </div>
          {errors.situationIds && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {errors.situationIds.message}
            </p>
          )}
        </div>
        <label className="block" htmlFor="training-total-hands">
          <span className="pt-label">Número de mãos</span>
          <input
            id="training-total-hands"
            type="number"
            min={1}
            max={500}
            className="pt-input"
            aria-invalid={errors.totalHands ? true : undefined}
            aria-describedby={errors.totalHands ? 'training-total-hands-err' : undefined}
            {...register('totalHands', { valueAsNumber: true })}
          />
          {errors.totalHands && (
            <p id="training-total-hands-err" className="mt-1 text-sm text-destructive" role="alert">
              {errors.totalHands.message}
            </p>
          )}
        </label>
        <label className="block" htmlFor="training-timer">
          <span className="pt-label">Timer (s, 0 = desligado)</span>
          <input
            id="training-timer"
            type="number"
            min={0}
            className="pt-input"
            aria-invalid={errors.timerSeconds ? true : undefined}
            aria-describedby={errors.timerSeconds ? 'training-timer-err' : undefined}
            {...register('timerSeconds', { valueAsNumber: true })}
          />
          {errors.timerSeconds && (
            <p id="training-timer-err" className="mt-1 text-sm text-destructive" role="alert">
              {errors.timerSeconds.message}
            </p>
          )}
        </label>
        <label className="block" htmlFor="training-feedback">
          <span className="pt-label">Feedback</span>
          <select id="training-feedback" className="pt-input" {...register('feedbackMode')}>
            <option value="IMMEDIATE">Imediato</option>
            <option value="END_OF_SESSION">Ao final</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={!situationIds.length}
          className="pt-btn-primary w-full py-3"
        >
          Iniciar
        </button>
      </form>
    </div>
  );
}
