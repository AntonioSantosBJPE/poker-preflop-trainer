import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  situationEditorFormSchema,
  situationPayloadSchema,
  type SituationEditorFormValues,
} from '@shared/forms/situationSchemas';
import { countCombosForCell } from '@shared/poker/grid';
import type { RangeCellEdit } from '../components/grid/RangeGrid13';
import type { GroupSummaryDto } from '@shared/ipc/types';
import { PageHeader } from '@/components/app';
import { RangeEditorPanel, SituationActionsEditor, SituationForm } from '@/components/situations';
import { Button } from '@/components/ui/button';

import { ipcErrorMessage } from '@/hooks/useIpcError';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function SituationEditPage(): React.ReactElement {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const groupIdQuery = searchParams.get('groupId');
  const newFormDefaults = useMemo<SituationEditorFormValues>(
    () => ({
      name: '',
      groupId: (() => {
        const n = groupIdQuery ? Number(groupIdQuery) : NaN;
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
      })(),
      position: 'BTN',
      description: '',
      effectiveStack: 100,
      actions: [
        {
          clientKey: uid('a'),
          name: 'Fold',
          actionType: 'FOLD',
          sizeBb: null,
          colorHex: '#95A5A6',
        },
        {
          clientKey: uid('a'),
          name: 'Raise 2.5BB',
          actionType: 'RAISE_OPEN',
          sizeBb: 2.5,
          colorHex: '#27AE60',
        },
      ],
    }),
    [groupIdQuery],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SituationEditorFormValues>({
    resolver: zodResolver(situationEditorFormSchema),
    defaultValues: newFormDefaults,
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!isNew) return;
    reset(newFormDefaults);
    setCells([]);
    setActiveActionKey(newFormDefaults.actions[0]?.clientKey ?? '');
  }, [isNew, newFormDefaults, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'actions',
  });

  const watchedActions = useWatch({ control, name: 'actions' });

  const [activeActionKey, setActiveActionKey] = useState('');
  const [cells, setCells] = useState<RangeCellEdit[]>([]);
  const [groups, setGroups] = useState<GroupSummaryDto[]>([]);

  useEffect(() => {
    void (async () => {
      const list = (await window.api.groups.list()) as GroupSummaryDto[];
      setGroups(list);
    })();
  }, []);

  useEffect(() => {
    const acts = watchedActions;
    if (!acts?.length) return;
    if (!activeActionKey || !acts.some((a) => a.clientKey === activeActionKey)) {
      setActiveActionKey(acts[0]!.clientKey);
    }
  }, [watchedActions, activeActionKey]);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    void (async () => {
      const s = (await window.api.situations.get(Number(id))) as {
        name: string;
        groupId: number;
        position: string;
        description: string | null;
        effectiveStack: number;
        actions: {
          id: number;
          name: string;
          actionType: string;
          sizeBb: number | null;
          colorHex: string;
          sortOrder: number;
        }[];
        rangeCells: {
          actionId: number;
          rowIndex: number;
          colIndex: number;
          frequency: number;
        }[];
      };
      if (cancelled) return;
      const mapped = s.actions.map((a) => ({
        clientKey: `k-${a.id}`,
        name: a.name,
        actionType: a.actionType as SituationEditorFormValues['actions'][number]['actionType'],
        sizeBb: a.sizeBb,
        colorHex: a.colorHex,
      }));
      reset({
        name: s.name,
        groupId: s.groupId,
        position: s.position as SituationEditorFormValues['position'],
        description: s.description ?? '',
        effectiveStack: s.effectiveStack,
        actions: mapped,
      });
      setActiveActionKey(mapped[0]?.clientKey ?? '');
      setCells(
        s.rangeCells
          .map((c) => ({
            actionClientKey: `k-${c.actionId}`,
            rowIndex: c.rowIndex,
            colIndex: c.colIndex,
            frequency: c.frequency,
          }))
          .filter((c) => mapped.some((m) => m.clientKey === c.actionClientKey)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, reset]);

  function addAction(): void {
    const row: SituationEditorFormValues['actions'][number] = {
      clientKey: uid('a'),
      name: 'Nova ação',
      actionType: 'CALL',
      sizeBb: null,
      colorHex: '#3498DB',
    };
    append(row);
    setActiveActionKey(row.clientKey);
  }

  function removeAt(index: number): void {
    const all = getValues('actions');
    const key = all[index]?.clientKey;
    const nextFirst = all.filter((_, i) => i !== index)[0]?.clientKey ?? '';
    remove(index);
    if (key) setCells((prev) => prev.filter((c) => c.actionClientKey !== key));
    if (key && activeActionKey === key) setActiveActionKey(nextFirst);
  }

  async function onValid(values: SituationEditorFormValues): Promise<void> {
    clearErrors('root');
    const payload = {
      name: values.name.trim(),
      groupId: values.groupId,
      position: values.position,
      description: values.description?.trim() ? values.description.trim() : null,
      effectiveStack: values.effectiveStack,
      actions: values.actions.map((a, i) => ({
        clientKey: a.clientKey,
        name: a.name,
        actionType: a.actionType,
        sizeBb: a.sizeBb,
        colorHex: a.colorHex,
        sortOrder: a.sortOrder ?? i,
      })),
      rangeCells: cells,
    };
    const parsed = situationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Dados inválidos';
      setError('root', { message: msg });
      return;
    }
    try {
      if (isNew) {
        await window.api.situations.create(parsed.data);
      } else {
        await window.api.situations.update(Number(id), parsed.data);
      }
      navigate('/situations');
    } catch (err) {
      setError('root', { message: ipcErrorMessage(err) });
    }
  }

  const gridActions =
    watchedActions?.map((a) => ({
      clientKey: a.clientKey,
      colorHex: a.colorHex,
      name: a.name,
    })) ?? [];

  const actionCombos = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of cells) {
      const combos = countCombosForCell(c.rowIndex, c.colIndex) * c.frequency;
      totals.set(c.actionClientKey, (totals.get(c.actionClientKey) ?? 0) + combos);
    }
    return totals;
  }, [cells]);

  const totalCombos = useMemo(() => {
    let sum = 0;
    for (const v of actionCombos.values()) sum += v;
    return sum;
  }, [actionCombos]);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => void handleSubmit(onValid)(e)}
      noValidate
    >
      <PageHeader
        title={isNew ? 'Nova situação' : 'Editar situação'}
        backLink={{ to: '/situations', label: '← Situações' }}
        actions={<Button type="submit">Salvar</Button>}
      />
      {errors.root?.message && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      )}
      <SituationForm register={register} errors={errors} groups={groups} />

      <SituationActionsEditor
        fields={fields}
        register={register}
        getValues={getValues}
        errors={errors}
        activeActionKey={activeActionKey}
        actionCombos={actionCombos}
        totalCombos={totalCombos}
        onSetActiveAction={setActiveActionKey}
        onClearAll={() => setCells([])}
        onAddAction={addAction}
        onClearAction={(clientKey) =>
          setCells((prev) => prev.filter((cell) => cell.actionClientKey !== clientKey))
        }
        onRemoveAt={removeAt}
      />

      <RangeEditorPanel
        actions={gridActions}
        activeActionKey={activeActionKey}
        cells={cells}
        onChange={setCells}
      />
    </form>
  );
}
