import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'E-mail obrigatório')
  .email('E-mail inválido')

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha obrigatória')
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

export const registerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome obrigatório')
    .max(120, 'Nome demasiado longo'),
  email: emailSchema,
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
})

export type RegisterFormValues = z.infer<typeof registerFormSchema>

export function parseAuthLoginInput(raw: unknown): LoginFormValues {
  return loginFormSchema.parse(raw)
}

export function parseAuthRegisterInput(raw: unknown): RegisterFormValues {
  return registerFormSchema.parse(raw)
}

export function formatZodError(err: unknown): string {
  if (err instanceof z.ZodError) {
    const first = err.issues[0]
    return first?.message ?? 'Dados inválidos'
  }
  throw err
}

const baseAuthFieldsSchema = z.object({
  name: z.string().optional(),
  email: emailSchema,
  password: z.string()
})

export type AuthFormFields = z.infer<typeof baseAuthFieldsSchema>

/** Esquema único para RHF: `mode` controla regras de login vs registo. */
export function createAuthFormSchema(mode: 'login' | 'register') {
  return baseAuthFieldsSchema.superRefine((data, ctx) => {
    if (mode === 'login') {
      if (!data.password?.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Senha obrigatória', path: ['password'] })
      }
      return
    }
    const name = data.name?.trim() ?? ''
    if (!name.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nome obrigatório', path: ['name'] })
    } else if (name.length > 120) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nome demasiado longo', path: ['name'] })
    }
    if (data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Senha deve ter pelo menos 8 caracteres',
        path: ['password']
      })
    }
  })
}
