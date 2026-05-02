import { useThemeStore } from '../stores/theme';

/** Cores hex para Recharts alinhadas à paleta Felt/âmbar (evita slate/emerald soltos). */
export function useChartPalette(): {
  grid: string;
  tick: string;
  primary: string;
  secondary: string;
} {
  const theme = useThemeStore((s) => s.theme);
  const dark = theme === 'dark';
  return dark
    ? {
        grid: '#2a4a3e',
        tick: '#9cb8ae',
        primary: '#c9a227',
        secondary: '#7fb6aa',
      }
    : {
        grid: '#d4cfc3',
        tick: '#4a5c54',
        primary: '#8b6914',
        secondary: '#5c7a72',
      };
}
