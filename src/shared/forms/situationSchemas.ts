import { z } from 'zod';
import { ACTION_TYPES, POSITIONS } from '@shared/constants';
import { appendImplicitFoldRangeCells } from './implicitFoldRangeCells';

const positionSchema = z.enum(POSITIONS, { message: 'Posição inválida' });

const raiseTypes = new Set(['RAISE_OPEN', 'RAISE_3BET', 'RAISE_4BET']);

export const situationActionInputSchema = z
  .object({
    clientKey: z.string().min(1, 'Chave da ação inválida'),
    name: z.string().trim().min(1, 'Nome da ação obrigatório'),
    actionType: z.enum(ACTION_TYPES, { message: 'Tipo de ação inválido' }),
    sizeBb: z.number().nullable().optional(),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/i, 'Cor inválida'),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .superRefine((a, ctx) => {
    if (raiseTypes.has(a.actionType)) {
      const s = a.sizeBb;
      if (s == null || !Number.isFinite(s) || s <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tamanho em BB obrigatório para raises',
          path: ['sizeBb'],
        });
      }
    }
  });

export const situationRangeCellSchema = z.object({
  actionClientKey: z.string().min(1),
  rowIndex: z.number().int().min(0).max(12),
  colIndex: z.number().int().min(0).max(12),
  frequency: z.number().min(0).max(1),
});

const situationCoreSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
  groupId: z.number().int().positive('Grupo obrigatório'),
  position: positionSchema,
  description: z.string().nullable().optional(),
  effectiveStack: z
    .number({ message: 'Stack efetivo inválido' })
    .int('Stack deve ser inteiro')
    .min(10, 'Stack efetivo entre 10 e 500 BB')
    .max(500, 'Stack efetivo entre 10 e 500 BB'),
  actions: z.array(situationActionInputSchema).min(1, 'Pelo menos uma ação'),
});

/** Campos do editor (sem células); usado com react-hook-form. */
export const situationEditorFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome obrigatório')
    .refine((s) => s.trim().length > 0, { message: 'Nome obrigatório' }),
  groupId: z.number().int().positive('Grupo obrigatório'),
  position: positionSchema,
  description: z.string().optional(),
  effectiveStack: z
    .number({ message: 'Stack efetivo inválido' })
    .int('Stack deve ser inteiro')
    .min(10, 'Stack efetivo entre 10 e 500 BB')
    .max(500, 'Stack efetivo entre 10 e 500 BB'),
  actions: z.array(situationActionInputSchema).min(1, 'Pelo menos uma ação'),
});

export type SituationEditorFormValues = z.infer<typeof situationEditorFormSchema>;

export const situationPayloadSchema = situationCoreSchema
  .extend({
    rangeCells: z.array(situationRangeCellSchema),
  })
  .transform((p) => ({
    ...p,
    rangeCells: appendImplicitFoldRangeCells(p.actions, p.rangeCells),
  }))
  .superRefine((p, ctx) => {
    const keys = new Set(p.actions.map((a) => a.clientKey));
    if (keys.size !== p.actions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'clientKey duplicado',
        path: ['actions'],
      });
    }
    let hasAny = false;
    for (const a of p.actions) {
      const cells = p.rangeCells.filter((c) => c.actionClientKey === a.clientKey);
      if (cells.length) hasAny = true;
    }
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pelo menos uma ação precisa ter células no range',
        path: ['rangeCells'],
      });
    }
    for (const c of p.rangeCells) {
      if (!keys.has(c.actionClientKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'actionClientKey inválido',
          path: ['rangeCells'],
        });
      }
    }
    const cellPos = new Set(p.rangeCells.map((c) => `${c.rowIndex},${c.colIndex}`));
    if (cellPos.size !== 169) {
      const hasFold = p.actions.some((a) => a.actionType === 'FOLD');
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: hasFold
          ? 'Range incompleto: verifique as células ou as acções.'
          : 'Para cobrir o tabuleiro completo, adicione pelo menos uma acção do tipo fold (células sem pintura contam como fold).',
        path: ['rangeCells'],
      });
    }
  });

export type SituationPayloadParsed = z.infer<typeof situationPayloadSchema>;

export function parseSituationPayload(raw: unknown): SituationPayloadParsed {
  const r = situationPayloadSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return r.data;
}
