import { useThemePreference } from '../context/ThemeContext';
import { darkColors, lightColors, type Colors } from './palettes';

/** Paleta ativa (clara ou escura), reativa à preferência salva em Ajustes → Aparência. */
export function useColors(): Colors {
  const { scheme } = useThemePreference();
  return scheme === 'dark' ? darkColors : lightColors;
}
