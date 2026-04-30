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
    <div className="max-w-md mx-auto mt-16 p-8 rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
      <h1 className="text-2xl font-bold mb-2">Preflop Trainer</h1>
      <p className="text-slate-400 text-sm mb-6">Treino offline de ranges pré-flop NLHE 6-max.</p>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          className={`flex-1 py-2 rounded ${tab === 'login' ? 'bg-emerald-600' : 'bg-slate-800'}`}
          onClick={() => setTab('login')}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`flex-1 py-2 rounded ${tab === 'register' ? 'bg-emerald-600' : 'bg-slate-800'}`}
          onClick={() => setTab('register')}
        >
          Criar conta
        </button>
      </div>
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        {tab === 'register' && (
          <div>
            <label htmlFor="auth-name" className="block text-sm text-slate-400 mb-1">
              Nome
            </label>
            <input
              id="auth-name"
              autoComplete="name"
              className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 aria-invalid:border-red-500"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'auth-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="auth-name-error" className="text-red-400 text-sm mt-1" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="block text-sm text-slate-400 mb-1">
            E-mail
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 aria-invalid:border-red-500"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'auth-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="auth-email-error" className="text-red-400 text-sm mt-1" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="auth-password" className="block text-sm text-slate-400 mb-1">
            Senha
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 aria-invalid:border-red-500"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'auth-password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="auth-password-error" className="text-red-400 text-sm mt-1" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>
        {errors.root?.message && (
          <p className="text-red-400 text-sm" role="alert">
            {errors.root.message}
          </p>
        )}
        <button type="submit" className="w-full py-2 rounded bg-emerald-600 font-medium">
          {tab === 'login' ? 'Entrar' : 'Cadastrar e entrar'}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">
        <Link to="/" className="text-emerald-400">
          Voltar
        </Link>
      </p>
    </div>
  )
}
