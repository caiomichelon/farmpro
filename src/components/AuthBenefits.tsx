import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT, type TFunction } from '../i18n';
import { radius, spacing, typography, useColors, type Colors } from '../theme';
import { FadeSlideIn } from './FadeSlideIn';

type BenefitAccent = 'lavoura' | 'funcionarios' | 'warning' | 'accent' | 'success' | 'pecuaria';

function benefitAccentColors(colors: Colors, accent: BenefitAccent): { color: string; tint: string } {
  switch (accent) {
    case 'lavoura':
      return { color: colors.lavoura, tint: colors.lavouraLight };
    case 'funcionarios':
      return { color: colors.funcionarios, tint: colors.funcionariosLight };
    case 'warning':
      return { color: colors.warning, tint: colors.warningLight };
    case 'accent':
      return { color: colors.accent, tint: `${colors.accent}1F` };
    case 'success':
      return { color: colors.success, tint: colors.successLight };
    case 'pecuaria':
      return { color: colors.pecuaria, tint: colors.pecuariaLight };
  }
}

function buildBenefits(t: TFunction): { icon: string; title: string; description: string; accent: BenefitAccent }[] {
  return [
    { icon: '🌱', title: t('auth.login.benefit1Title'), description: t('auth.login.benefit1Description'), accent: 'lavoura' },
    { icon: '☁️', title: t('auth.login.benefit2Title'), description: t('auth.login.benefit2Description'), accent: 'funcionarios' },
    { icon: '🔔', title: t('auth.login.benefit3Title'), description: t('auth.login.benefit3Description'), accent: 'warning' },
    { icon: '📊', title: t('auth.login.benefit4Title'), description: t('auth.login.benefit4Description'), accent: 'accent' },
    { icon: '🧮', title: t('auth.login.benefit5Title'), description: t('auth.login.benefit5Description'), accent: 'success' },
    { icon: '📶', title: t('auth.login.benefit6Title'), description: t('auth.login.benefit6Description'), accent: 'pecuaria' },
  ];
}

/** Faixa "Por que o FarmPro" — grade de 2 colunas com os prós do app, cada
 * um numa cor de setor/estado diferente (mesma paleta terrosa do resto do
 * app, sem gradiente/neon). Full-bleed logo abaixo do hero animado, pra
 * dar continuidade visual e cortar aquele branco vazio entre o hero e o
 * formulário. Compartilhado por login e signup — é a primeira coisa que
 * quem ainda não é cliente vê depois do selo. */
export function AuthBenefits() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const benefits = useMemo(() => buildBenefits(t), [t]);

  return (
    <View style={styles.band}>
      <FadeSlideIn delay={60}>
        <Text style={styles.title}>{t('auth.login.benefitsTitle')}</Text>
      </FadeSlideIn>
      <View style={styles.grid}>
        {benefits.map((benefit, index) => {
          const { color, tint } = benefitAccentColors(colors, benefit.accent);
          return (
            <FadeSlideIn key={benefit.title} delay={100 + index * 55} style={styles.cardWrap}>
              <View style={[styles.card, { backgroundColor: tint }]}>
                <View style={[styles.iconBadge, { backgroundColor: colors.surface }]}>
                  <Text style={styles.icon}>{benefit.icon}</Text>
                </View>
                <Text style={[styles.cardTitle, { color }]}>{benefit.title}</Text>
                <Text style={styles.cardDescription}>{benefit.description}</Text>
              </View>
            </FadeSlideIn>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    band: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    title: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    cardWrap: {
      flexBasis: '46%',
      flexGrow: 1,
    },
    card: {
      flex: 1,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      fontSize: 18,
    },
    cardTitle: {
      ...typography.bodyMedium,
    },
    cardDescription: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
