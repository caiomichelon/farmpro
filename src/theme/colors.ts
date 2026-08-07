/**
 * Paleta do FarmPro.
 *
 * Referência: visual profissional e sério, sem gradientes/neon, sem "cara de
 * gerado por IA". Base em tons terrosos e verde-mato, com bom contraste para
 * uso a pleno sol no campo.
 */
export const colors = {
  // Fundo e superfícies
  background: '#F6F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEDE4',
  border: '#DFDBCC',
  borderStrong: '#C7C2AE',

  // Texto
  textPrimary: '#1D2420',
  textSecondary: '#5B6259',
  textMuted: '#8A8F84',
  textInverse: '#F6F5F0',

  // Marca
  primary: '#243B2C',
  primaryDark: '#162419',
  primaryLight: '#3C5A45',

  // Setores
  lavoura: '#4C6B3A',
  lavouraLight: '#EAF0E2',
  pecuaria: '#8A4B32',
  pecuariaLight: '#F5E7DE',

  // Estado / feedback
  success: '#3F7A4E',
  successLight: '#E4F0E6',
  danger: '#A23B2E',
  dangerLight: '#F6E4E1',
  warning: '#B4802E',
  warningLight: '#F6EDDD',

  // Acento (cotações, destaques)
  accent: '#B4702E',
} as const;

export type ColorToken = keyof typeof colors;
