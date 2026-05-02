import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { createAuthFormSchema, type AuthFormFields } from '@shared/forms/authSchemas';
import { FormField, PasswordField } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../stores/auth';

type AuthTab = 'login' | 'register';

type FormValues = AuthFormFields;

function ipcErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Erro';
}

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/assets/logo/logo-master.png"
          alt="Preflop Trainer"
          className="h-14 w-auto max-w-[280px] object-contain dark:brightness-[1.06]"
        />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-semibold leading-none">Preflop Trainer</h1>
            <CardDescription>Treino offline de ranges pré-flop NLHE 6-max.</CardDescription>
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
              <p className="text-sm text-destructive" role="alert">
                {errors.root.message}
              </p>
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
  );
}
