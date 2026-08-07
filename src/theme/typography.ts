/**
 * Escala tipográfica do FarmPro.
 *
 * Usamos Inter em todas as plataformas para manter a mesma identidade visual
 * no iOS e no Android (em vez de depender da fonte padrão do sistema).
 */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  displayLg: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 38 },
  displayMd: { fontFamily: fontFamily.bold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fontFamily.semiBold, fontSize: 20, lineHeight: 26 },
  subheading: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} as const;
