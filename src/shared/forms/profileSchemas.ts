import { z } from 'zod';
import { FEEDBACK_MODES, THEME_MODES } from '@shared/constants';
import { registerFormSchema } from './authSchemas';

const profileNameFieldSchema = registerFormSchema.shape.name;

export const profileNameSchema = z.object({
  name: profileNameFieldSchema,
});

export type ProfileNameInput = z.infer<typeof profileNameSchema>;

export const profileChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  })
  .superRefine((data, ctx) => {
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nova senha deve ser diferente da senha atual',
        path: ['newPassword'],
      });
    }
  });

export type ProfileChangePasswordInput = z.infer<typeof profileChangePasswordSchema>;

const profilePreferencesFieldSchema = {
  theme: z.enum(THEME_MODES, { message: 'Tema inválido' }).nullable().optional(),
  defaultTrainingTotalHands: z
    .number({ message: 'Número de mãos inválido' })
    .int('Número de mãos deve ser inteiro')
    .min(1, 'Mínimo 1 mão')
    .max(500, 'Máximo 500 mãos')
    .nullable()
    .optional(),
  defaultTrainingTimerSeconds: z
    .number({ message: 'Timer inválido' })
    .int('Timer deve ser inteiro')
    .min(0, 'Timer não pode ser negativo')
    .nullable()
    .optional(),
  defaultTrainingFeedbackMode: z
    .enum(FEEDBACK_MODES, { message: 'Modo de feedback inválido' })
    .nullable()
    .optional(),
  defaultSimultaneousTableCount: z
    .union([z.literal(2), z.literal(3), z.literal(4)], { message: 'Número de mesas inválido' })
    .nullable()
    .optional(),
};

export const profilePreferencesSchema = z
  .object(profilePreferencesFieldSchema)
  .superRefine((data, ctx) => {
    const hasAtLeastOneField = Object.values(data).some((value) => value !== undefined);
    if (!hasAtLeastOneField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos uma preferência para atualizar',
      });
    }
  });

export type ProfilePreferencesInput = z.infer<typeof profilePreferencesSchema>;

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Dados inválidos');
  }
  return result.data;
}

export function parseProfileNameInput(raw: unknown): ProfileNameInput {
  return parseOrThrow(profileNameSchema, raw);
}

export function parseProfileChangePasswordInput(raw: unknown): ProfileChangePasswordInput {
  return parseOrThrow(profileChangePasswordSchema, raw);
}

export function parseProfilePreferencesInput(raw: unknown): ProfilePreferencesInput {
  return parseOrThrow(profilePreferencesSchema, raw);
}
