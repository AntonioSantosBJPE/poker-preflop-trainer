import { useEffect } from 'react';
import { getEffectivePreferences, usePreferencesStore } from '../stores/preferences';

/** Sincroniza a classe `dark` a partir das preferências efetivas da conta autenticada. */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    const apply = () => {
      const mode = getEffectivePreferences().theme;
      document.documentElement.classList.toggle('dark', mode === 'dark');
    };
    apply();

    const unsub = usePreferencesStore.subscribe((state, prevState) => {
      if (state.raw !== prevState.raw || state.ready !== prevState.ready) {
        apply();
      }
    });
    return unsub;
  }, []);
  return <>{children}</>;
}
