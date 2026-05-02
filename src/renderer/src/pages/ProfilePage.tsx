import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_USER_PREFERENCES, FEEDBACK_MODES, THEME_MODES, type ThemeMode } from '@shared/constants';
import {
  profileChangePasswordSchema,
  profileNameSchema,
} from '@shared/forms/profileSchemas';
import type { ApiUserPreferences } from '@/env';
import { PageHeader, SectionCard } from '@/components/app';
import {
  FormField,
  FormNumberField,
  FormSelectField,
  PasswordField,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { usePreferencesStore } from '../stores/preferences';

const preferencesFormSchema = z.object({
  theme: z.enum(THEME_MODES, { message: 'Tema inválido' }),
  defaultTrainingTotalHands: z
    .number({ message: 'Número de mãos inválido' })
    .int('Número de mãos deve ser inteiro')
    .min(1, 'Mínimo 1 mão')
    .max(500, 'Máximo 500 mãos'),
  defaultTrainingTimerSeconds: z
    .number({ message: 'Timer inválido' })
    .int('Timer deve ser inteiro')
    .min(0, 'Timer não pode ser negativo'),
  defaultTrainingFeedbackMode: z.enum(FEEDBACK_MODES, {
    message: 'Modo de feedback inválido',
  }),
  defaultSimultaneousTableCount: z.union([z.literal(2), z.literal(3), z.literal(4)], {
    message: 'Número de mesas inválido',
  }),
});

type NameFormValues = z.infer<typeof profileNameSchema>;
type PasswordFormValues = z.infer<typeof profileChangePasswordSchema>;
type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

const themeOptions = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
] as const;

const feedbackOptions = [
  { value: 'IMMEDIATE', label: 'Imediato' },
  { value: 'END_OF_SESSION', label: 'Ao final' },
] as const;

const simultaneousTableOptions = [
  { value: '2', label: '2 mesas' },
  { value: '3', label: '3 mesas' },
  { value: '4', label: '4 mesas' },
] as const;

function ipcErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Erro';
}

function toPreferencesFormValues(raw: ApiUserPreferences | null): PreferencesFormValues {
  return {
    theme: (raw?.theme ?? DEFAULT_USER_PREFERENCES.theme) as ThemeMode,
    defaultTrainingTotalHands:
      raw?.defaultTrainingTotalHands ?? DEFAULT_USER_PREFERENCES.defaultTrainingTotalHands,
    defaultTrainingTimerSeconds:
      raw?.defaultTrainingTimerSeconds ?? DEFAULT_USER_PREFERENCES.defaultTrainingTimerSeconds,
    defaultTrainingFeedbackMode:
      raw?.defaultTrainingFeedbackMode ?? DEFAULT_USER_PREFERENCES.defaultTrainingFeedbackMode,
    defaultSimultaneousTableCount:
      raw?.defaultSimultaneousTableCount ?? DEFAULT_USER_PREFERENCES.defaultSimultaneousTableCount,
  };
}

export function ProfilePage(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const applySessionSnapshot = useAuthStore((s) => s.applySessionSnapshot);
  const rawPreferences = usePreferencesStore((s) => s.raw);
  const preferencesReady = usePreferencesStore((s) => s.ready);
  const setThemeLocally = usePreferencesStore((s) => s.setThemeLocally);

  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [preferencesFeedback, setPreferencesFeedback] = useState<string | null>(null);

  const effectivePreferences = useMemo(
    () => toPreferencesFormValues(rawPreferences),
    [rawPreferences],
  );

  const {
    register: registerName,
    handleSubmit: handleSubmitName,
    reset: resetNameForm,
    formState: { errors: nameErrors, isSubmitting: isUpdatingName },
    setError: setNameError,
  } = useForm<NameFormValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: {
      name: user?.name ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    setError: setPasswordError,
    formState: { errors: passwordErrors, isSubmitting: isChangingPassword },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(profileChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const {
    register: registerPreferences,
    control: preferencesControl,
    handleSubmit: handleSubmitPreferences,
    setValue: setPreferenceValue,
    setError: setPreferencesError,
    reset: resetPreferencesForm,
    formState: {
      errors: preferencesErrors,
      dirtyFields: preferencesDirtyFields,
      isSubmitting: isSavingPreferences,
    },
  } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: effectivePreferences,
  });

  useEffect(() => {
    if (!user) return;
    resetNameForm({ name: user.name });
  }, [user, resetNameForm]);

  useEffect(() => {
    if (!preferencesReady) return;

    if (!preferencesDirtyFields.theme) {
      setPreferenceValue('theme', effectivePreferences.theme, { shouldDirty: false });
    }
    if (!preferencesDirtyFields.defaultTrainingTotalHands) {
      setPreferenceValue('defaultTrainingTotalHands', effectivePreferences.defaultTrainingTotalHands, {
        shouldDirty: false,
      });
    }
    if (!preferencesDirtyFields.defaultTrainingTimerSeconds) {
      setPreferenceValue(
        'defaultTrainingTimerSeconds',
        effectivePreferences.defaultTrainingTimerSeconds,
        {
          shouldDirty: false,
        },
      );
    }
    if (!preferencesDirtyFields.defaultTrainingFeedbackMode) {
      setPreferenceValue(
        'defaultTrainingFeedbackMode',
        effectivePreferences.defaultTrainingFeedbackMode,
        {
          shouldDirty: false,
        },
      );
    }
    if (!preferencesDirtyFields.defaultSimultaneousTableCount) {
      setPreferenceValue(
        'defaultSimultaneousTableCount',
        effectivePreferences.defaultSimultaneousTableCount,
        {
          shouldDirty: false,
        },
      );
    }
  }, [
    effectivePreferences,
    preferencesDirtyFields.defaultSimultaneousTableCount,
    preferencesDirtyFields.defaultTrainingFeedbackMode,
    preferencesDirtyFields.defaultTrainingTimerSeconds,
    preferencesDirtyFields.defaultTrainingTotalHands,
    preferencesDirtyFields.theme,
    preferencesReady,
    setPreferenceValue,
  ]);

  async function onSubmitName(values: NameFormValues): Promise<void> {
    setAccountFeedback(null);
    try {
      const snapshot = await window.api.profile.updateName(values.name);
      applySessionSnapshot(snapshot);
      resetNameForm({ name: snapshot.user.name });
      setAccountFeedback('Nome atualizado com sucesso.');
    } catch (err) {
      setNameError('root', { message: ipcErrorMessage(err) });
    }
  }

  async function onSubmitPassword(values: PasswordFormValues): Promise<void> {
    setPasswordFeedback(null);
    try {
      await window.api.profile.changePassword(values.currentPassword, values.newPassword);
      resetPasswordForm({ currentPassword: '', newPassword: '' });
      setPasswordFeedback('Senha alterada com sucesso.');
    } catch (err) {
      const message = ipcErrorMessage(err);
      if (message === 'Senha atual inválida') {
        setPasswordError('currentPassword', { message });
        return;
      }
      setPasswordError('root', { message });
    }
  }

  async function onSubmitPreferences(values: PreferencesFormValues): Promise<void> {
    setPreferencesFeedback(null);
    const previousTheme = effectivePreferences.theme;
    setThemeLocally(values.theme);
    try {
      const snapshot = await window.api.profile.updatePreferences(values);
      applySessionSnapshot(snapshot);
      resetPreferencesForm(toPreferencesFormValues(snapshot.preferences));
      setPreferencesFeedback('Preferências guardadas com sucesso.');
    } catch (err) {
      setThemeLocally(previousTheme);
      setPreferencesError('root', { message: ipcErrorMessage(err) });
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="profile-page">
      <PageHeader
        title="Perfil"
        description="Gerencie os dados da conta, segurança e preferências padrão."
      />

      <SectionCard
        title="Conta"
        description="Atualize o nome da sua conta."
        testId="profile-section-account"
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => void handleSubmitName(onSubmitName)(event)}
          noValidate
        >
          <FormField
            id="profile-name"
            label="Nome"
            register={registerName('name')}
            error={nameErrors.name?.message}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-email" className="text-sm font-medium leading-none">
              E-mail
            </label>
            <Input id="profile-email" value={user?.email ?? ''} readOnly disabled />
          </div>

          {nameErrors.root?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {nameErrors.root.message}
            </p>
          ) : null}
          {accountFeedback ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {accountFeedback}
            </p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={isUpdatingName}>
              Guardar nome
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Segurança"
        description="Altere sua senha informando a senha atual."
        testId="profile-section-security"
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => void handleSubmitPassword(onSubmitPassword)(event)}
          noValidate
        >
          <PasswordField
            id="profile-current-password"
            label="Senha atual"
            register={registerPassword('currentPassword')}
            error={passwordErrors.currentPassword?.message}
          />
          <PasswordField
            id="profile-new-password"
            label="Nova senha"
            register={registerPassword('newPassword')}
            error={passwordErrors.newPassword?.message}
          />

          {passwordErrors.root?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {passwordErrors.root.message}
            </p>
          ) : null}
          {passwordFeedback ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {passwordFeedback}
            </p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={isChangingPassword}>
              Alterar senha
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Preferências"
        description="Defaults aplicados automaticamente nos fluxos de treino e tema."
        testId="profile-section-preferences"
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => void handleSubmitPreferences(onSubmitPreferences)(event)}
          noValidate
        >
          <Controller
            control={preferencesControl}
            name="theme"
            render={({ field }) => (
              <FormSelectField
                id="profile-theme"
                label="Tema"
                value={field.value}
                onValueChange={(value) => field.onChange(value as ThemeMode)}
                options={[...themeOptions]}
                error={preferencesErrors.theme?.message}
              />
            )}
          />

          <Controller
            control={preferencesControl}
            name="defaultTrainingFeedbackMode"
            render={({ field }) => (
              <FormSelectField
                id="profile-feedback-mode"
                label="Feedback padrão"
                value={field.value}
                onValueChange={(value) => field.onChange(value as PreferencesFormValues['defaultTrainingFeedbackMode'])}
                options={[...feedbackOptions]}
                error={preferencesErrors.defaultTrainingFeedbackMode?.message}
              />
            )}
          />

          <FormNumberField
            id="profile-default-total-hands"
            label="Mãos padrão"
            register={registerPreferences('defaultTrainingTotalHands', { valueAsNumber: true })}
            min={1}
            error={preferencesErrors.defaultTrainingTotalHands?.message}
          />
          <FormNumberField
            id="profile-default-timer"
            label="Timer padrão (s)"
            register={registerPreferences('defaultTrainingTimerSeconds', { valueAsNumber: true })}
            min={0}
            error={preferencesErrors.defaultTrainingTimerSeconds?.message}
          />

          <Controller
            control={preferencesControl}
            name="defaultSimultaneousTableCount"
            render={({ field }) => (
              <FormSelectField
                id="profile-default-simultaneous-table-count"
                label="Mesas simultâneas padrão"
                value={String(field.value)}
                onValueChange={(value) => field.onChange(Number(value) as 2 | 3 | 4)}
                options={[...simultaneousTableOptions]}
                error={preferencesErrors.defaultSimultaneousTableCount?.message}
              />
            )}
          />

          {preferencesErrors.root?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {preferencesErrors.root.message}
            </p>
          ) : null}
          {preferencesFeedback ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {preferencesFeedback}
            </p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={isSavingPreferences}>
              Guardar preferências
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
