/**
 * Paletas do FarmPro — clara e escura.
 *
 * Mesma linha visual nas duas: tons terrosos e verde-mato, profissional e
 * sério, sem gradientes/neon. No modo escuro os tons de superfície ficam
 * mais quentes/acinzentados (não preto puro) e as cores de setor (lavoura,
 * pecuária, funcionários) ficam mais claras/vívidas pra manter contraste
 * legível sobre fundo escuro.
 */
export interface Colors {
  // Fundo e superfícies
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;

  // Texto
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Marca
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Setores
  lavoura: string;
  lavouraLight: string;
  pecuaria: string;
  pecuariaLight: string;
  funcionarios: string;
  funcionariosLight: string;
  estoque: string;
  estoqueLight: string;

  // Estado / feedback
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;

  // Acento (cotações, destaques)
  accent: string;
}

export const lightColors: Colors = {
  background: '#F6F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEDE4',
  border: '#DFDBCC',
  borderStrong: '#C7C2AE',

  textPrimary: '#1D2420',
  textSecondary: '#5B6259',
  textMuted: '#8A8F84',
  textInverse: '#F6F5F0',

  primary: '#243B2C',
  primaryDark: '#162419',
  primaryLight: '#3C5A45',

  lavoura: '#4C6B3A',
  lavouraLight: '#EAF0E2',
  pecuaria: '#8A4B32',
  pecuariaLight: '#F5E7DE',
  funcionarios: '#3E5C6B',
  funcionariosLight: '#E4EBEE',
  estoque: '#8C7A3D',
  estoqueLight: '#F1EDDA',

  success: '#3F7A4E',
  successLight: '#E4F0E6',
  danger: '#A23B2E',
  dangerLight: '#F6E4E1',
  warning: '#B4802E',
  warningLight: '#F6EDDD',

  accent: '#B4702E',
};

export const darkColors: Colors = {
  background: '#14180F',
  surface: '#1E2418',
  surfaceAlt: '#262D1F',
  border: '#38402F',
  borderStrong: '#4C5642',

  textPrimary: '#EEEFE7',
  textSecondary: '#AEB5A2',
  textMuted: '#7C8374',
  textInverse: '#F1F3EA',

  primary: '#4C7057',
  primaryDark: '#324B39',
  primaryLight: '#68906F',

  lavoura: '#84A863',
  lavouraLight: '#24301C',
  pecuaria: '#CE8B5C',
  pecuariaLight: '#34261A',
  funcionarios: '#7DA0B2',
  funcionariosLight: '#1F2B31',
  estoque: '#C9B36B',
  estoqueLight: '#322C1A',

  success: '#63A873',
  successLight: '#1D2C1F',
  danger: '#D2735F',
  dangerLight: '#33201A',
  warning: '#D6A662',
  warningLight: '#332A19',

  accent: '#D6954F',
};

export type ColorToken = keyof Colors;
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';
