import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { createAuthFormSchema, type AuthFormFields } from '@shared/forms/authSchemas'
import { useAuthStore } from '../stores/auth'

type AuthTab = 'login' | 'register'

type FormValues = AuthFormFields

function ipcErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Erro'
}

export function LoginPage(): React.ReactElement {
  const [tab, setTab] = useState<AuthTab>('login')
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const resolver = useMemo(() => zodResolver(createAuthFormSchema(tab)), [tab])

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors }
  } = useForm<FormValues>({
    resolver,
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onSubmit'
  })

  useEffect(() => {
    void useAuthStore.getState().refresh().then(() => {
      if (useAuthStore.getState().user) navigate('/', { replace: true })
    })
  }, [navigate])

  useEffect(() => {
    clearErrors()
  }, [tab, clearErrors])

  async function onSubmit(values: FormValues): Promise<void> {
    clearErrors('root')
    try {
      if (tab === 'register') {
        await window.api.auth.register(values.name!.trim(), values.email, values.password)
      }
      const res = await window.api.auth.login(values.email, values.password)
      setUser(res.user)
      navigate('/')
    } catch (err) {
      setError('root', { message: ipcErrorMessage(err) })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/assets/logo/logo-master.png"
          alt="Preflop Trainer"
          className="h-14 w-auto max-w-[280px] object-contain dark:brightness-[1.06]"
        />
      </div>
      <div className="pt-card w-full max-w-md space-y-6 p-8 shadow-lg">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Preflop Trainer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Treino offline de ranges pré-flop NLHE 6-max.
          </p>
        </div>
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            data-testid="auth-tab-login"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'login' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setTab('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            data-testid="auth-tab-register"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'register' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setTab('register')}
          >
            Criar conta
          </button>
        </div>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          {tab === 'register' && (
            <div>
              <label htmlFor="auth-name" className="pt-label">
                Nome
              </label>
              <input
                id="auth-name"
                autoComplete="name"
                className="pt-input"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? 'auth-name-error' : undefined}
                {...register('name')}
              />
              {errors.name && (
                <p id="auth-name-error" className="mt-1 text-sm text-destructive" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="pt-label">
              E-mail
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              className="pt-input"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'auth-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="auth-email-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="auth-password" className="pt-label">
              Senha
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
              className="pt-input"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'auth-password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="auth-password-error" className="mt-1 text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>
          {errors.root?.message && (
            <p className="text-sm text-destructive" role="alert">
              {errors.root.message}
            </p>
          )}
          <button type="submit" className="pt-btn-primary w-full py-2.5">
            {tab === 'login' ? 'Entrar' : 'Cadastrar e entrar'}
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="text-primary hover:underline">
            Voltar
          </Link>
        </p>
      </div>
    </div>
  )
}
