import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { createAuthFormSchema, type AuthFormFields } from '@shared/forms/authSchemas';
import { StatusMessage } from '@/components/app';
import { FormField, PasswordField } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../stores/auth';
import { BarChart3, Brain, ShieldCheck } from 'lucide-react';

type AuthTab = 'login' | 'register';

type FormValues = AuthFormFields;

import { ipcErrorMessage } from '@/hooks/useIpcError';

const logoSrc =
  window.location.protocol === 'file:'
    ? new URL(/* @vite-ignore */ '../assets/logo/logo-master.png', import.meta.url).href
    : '/assets/logo/logo-master.png';

export function LoginPage(): React.ReactElement {
  const [tab, setTab] = useState<AuthTab>('login');
  const navigate = useNavigate();
  const applySessionSnapshot = useAuthStore((s) => s.applySessionSnapshot);

  const resolver = useMemo(() => zodResolver(createAuthFormSchema(tab)), [tab]);

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    void useAuthStore
      .getState()
      .refresh()
      .then(() => {
        if (useAuthStore.getState().user) navigate('/', { replace: true });
      });
  }, [navigate]);

  useEffect(() => {
    clearErrors();
  }, [tab, clearErrors]);

  async function onSubmit(values: FormValues): Promise<void> {
    clearErrors('root');
    try {
      if (tab === 'register') {
        await window.api.auth.register(values.name!.trim(), values.email, values.password);
      }
      const res = await window.api.auth.login(values.email, values.password);
      applySessionSnapshot({ user: res.user, preferences: res.preferences });
      navigate('/');
    } catch (err) {
      setError('root', { message: ipcErrorMessage(err) });
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="flex flex-col gap-8">
          <img
            src={logoSrc}
            alt="Preflop Trainer"
            className="h-16 w-fit max-w-[300px] object-contain dark:brightness-[1.06]"
          />

          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
              Preflop Trainer
            </h1>
            <p className="text-lg text-muted-foreground">
              Estudo deliberado de ranges pré-flop 6-max com feedback imediato, revisão de mãos e
              estatísticas acionáveis.
            </p>
          </div>

          <div className="grid max-w-3xl gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/80 p-4">
              <Brain className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">Treino focado</p>
              <p className="mt-1 text-xs text-muted-foreground">Situações, posições e ranges.</p>
            </div>
            <div className="rounded-xl border border-border bg-card/80 p-4">
              <BarChart3 className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">Evolução clara</p>
              <p className="mt-1 text-xs text-muted-foreground">Acerto, tempo e vazamentos.</p>
            </div>
            <div className="rounded-xl border border-border bg-card/80 p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">Offline-first</p>
              <p className="mt-1 text-xs text-muted-foreground">Dados locais no desktop.</p>
            </div>
          </div>
        </section>

        <Card className="w-full shadow-lg">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>Entrar no estudo</CardTitle>
              <CardDescription>
                Use sua conta local para continuar treinos e revisar histórico.
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2" aria-label="Modo de autenticação">
              <button
                type="button"
                data-testid="auth-tab-login"
                aria-selected={tab === 'login'}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  tab === 'login'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
                )}
                onClick={() => setTab('login')}
              >
                Entrar
              </button>
              <button
                type="button"
                data-testid="auth-tab-register"
                aria-selected={tab === 'register'}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  tab === 'register'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
                )}
                onClick={() => setTab('register')}
              >
                Criar conta
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => void handleSubmit(onSubmit)(e)}
              noValidate
            >
              {tab === 'register' && (
                <FormField
                  id="auth-name"
                  label="Nome"
                  register={register('name')}
                  error={errors.name?.message}
                />
              )}
              <FormField
                id="auth-email"
                label="E-mail"
                type="email"
                register={register('email')}
                error={errors.email?.message}
              />
              <PasswordField
                id="auth-password"
                label="Senha"
                register={register('password')}
                error={errors.password?.message}
              />
              {errors.root?.message && (
                <StatusMessage tone="error" role="alert">
                  {errors.root.message}
                </StatusMessage>
              )}
              <Button type="submit" className="w-full">
                {tab === 'login' ? 'Entrar' : 'Cadastrar e entrar'}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/" className="text-primary hover:underline">
                Voltar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
