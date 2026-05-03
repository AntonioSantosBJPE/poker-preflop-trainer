import { z } from 'zod';
import { FEEDBACK_MODES } from '@shared/constants';

export const trainingStartFormSchema = z.object({
  groupId: z.number().int().positive('Grupo obrigatório'),
  situationIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos uma situação'),
  totalHands: z
    .number({ message: 'Número de mãos inválido' })
    .int('Número de mãos deve ser inteiro')
    .min(1, 'Mínimo 1 mão')
    .max(500, 'Máximo 500 mãos'),
  timerSeconds: z
    .number({ message: 'Timer inválido' })
    .int('Timer deve ser inteiro')
    .min(0, 'Timer não pode ser negativo'),
  feedbackMode: z.enum(FEEDBACK_MODES, { message: 'Modo de feedback inválido' }),
});

export type TrainingStartFormValues = z.infer<typeof trainingStartFormSchema>;

export const trainingStartSessionSchema = trainingStartFormSchema;

export type TrainingStartSessionInput = z.infer<typeof trainingStartSessionSchema>;

export function parseTrainingStartSession(raw: unknown): TrainingStartSessionInput {
  const r = trainingStartSessionSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return r.data;
}

export const simultaneousTrainingStartSchema = trainingStartFormSchema.extend({
  tableCount: z.coerce
    .number({ message: 'Número de mesas inválido' })
    .int('Número de mesas deve ser inteiro')
    .min(2, 'Mínimo 2 mesas')
    .max(4, 'Máximo 4 mesas'),
});

export type SimultaneousTrainingStartInput = z.infer<typeof simultaneousTrainingStartSchema>;
export type SimultaneousTrainingStartFormInput = z.input<typeof simultaneousTrainingStartSchema>;

export function parseSimultaneousTrainingStart(raw: unknown): SimultaneousTrainingStartInput {
  const r = simultaneousTrainingStartSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return r.data;
}

export const sessionHistoryFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  groupId: z.number().int().positive().optional(),
  sessionType: z.enum(['single', 'simultaneous']).optional(),
  simultaneousTableCount: z
    .union([z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
});

export type SessionHistoryFiltersInput = z.infer<typeof sessionHistoryFiltersSchema>;

export function parseSessionHistoryFilters(raw: unknown): SessionHistoryFiltersInput {
  const r = sessionHistoryFiltersSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return r.data;
}
