import { useEffect } from 'react'
import { useThemeStore } from '../stores/theme'

/** Sincroniza classe `dark` após hidratação do Zustand persist (além do script inline em index.html). */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    const t = useThemeStore.getState().theme
    document.documentElement.classList.toggle('dark', t === 'dark')
    const unsub = useThemeStore.persist.onFinishHydration(() => {
      const mode = useThemeStore.getState().theme
      document.documentElement.classList.toggle('dark', mode === 'dark')
    })
    return unsub
  }, [])
  return <>{children}</>
}
