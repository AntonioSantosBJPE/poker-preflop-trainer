import { z } from 'zod'
import { FEEDBACK_MODES } from '@shared/constants'

export const trainingStartFormSchema = z.object({
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
  feedbackMode: z.enum(FEEDBACK_MODES, { message: 'Modo de feedback inválido' })
})

export type TrainingStartFormValues = z.infer<typeof trainingStartFormSchema>

export const trainingStartSessionSchema = trainingStartFormSchema

export type TrainingStartSessionInput = z.infer<typeof trainingStartSessionSchema>

export function parseTrainingStartSession(raw: unknown): TrainingStartSessionInput {
  const r = trainingStartSessionSchema.safeParse(raw)
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? 'Dados inválidos')
  }
  return r.data
}
