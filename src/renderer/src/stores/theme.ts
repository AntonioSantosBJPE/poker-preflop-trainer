import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

function applyDomTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

type ThemeSlice = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create(
  persist<ThemeSlice>(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        applyDomTheme(theme);
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: 'pt-theme',
      partialize: ((state: ThemeSlice) => ({ theme: state.theme })) as (
        s: ThemeSlice,
      ) => ThemeSlice,
      onRehydrateStorage: () => (state) => {
        if (state) applyDomTheme(state.theme);
      },
    },
  ),
);
