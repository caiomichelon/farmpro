import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeSlideIn } from '../../src/components/FadeSlideIn';
import { useT } from '../../src/i18n';
import type { FarmSectorType } from '../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../src/theme';

/** Primeira tela do fluxo de criar fazenda: escolher o tipo (obrigatório,
 * não dá pra mudar depois) numa tela cheia com 3 cartões grandes — mesmo
 * padrão de toque direto da tela de escolher setor (app/setor.tsx), não um
 * seletor pequeno dentro de formulário. Escolheu, já vai pra próxima tela
 * (preencher nome/cidade/UF). */
export default function NewFarmSectorTypeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  function choose(sectorType: FarmSectorType) {
    router.push(`/farms/novo-detalhes?sectorType=${sectorType}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FadeSlideIn>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backLink}>{t('common.back')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('newFarmType.title')}</Text>
          <Text style={styles.subtitle}>{t('newFarmType.subtitle')}</Text>
        </View>
      </FadeSlideIn>

      {/* View fixa (não ScrollView) de propósito — mesmo motivo documentado
          em app/setor.tsx: dentro de ScrollView o flex:1 dos cartões não
          encolhe pra caber, e os 3 têm que caber sem precisar rolar. */}
      <View style={styles.content}>
        <FadeSlideIn delay={60} style={styles.cardWrap}>
          <TypeCard
            title={t('farms.sectorTypeLavoura')}
            subtitle={t('newFarmType.lavouraSubtitle')}
            color={colors.lavoura}
            backgroundColor={colors.lavouraLight}
            onPress={() => choose('lavoura')}
          />
        </FadeSlideIn>
        <FadeSlideIn delay={100} style={styles.cardWrap}>
          <TypeCard
            title={t('farms.sectorTypePecuaria')}
            subtitle={t('newFarmType.pecuariaSubtitle')}
            color={colors.pecuaria}
            backgroundColor={colors.pecuariaLight}
            onPress={() => choose('pecuaria')}
          />
        </FadeSlideIn>
        <FadeSlideIn delay={140} style={styles.cardWrap}>
          <TypeCard
            title={t('farms.sectorTypeAmbos')}
            subtitle={t('newFarmType.ambosSubtitle')}
            color={colors.primary}
            backgroundColor={colors.surface}
            onPress={() => choose('ambos')}
          />
        </FadeSlideIn>
      </View>
    </SafeAreaView>
  );
}

function TypeCard({
  title,
  subtitle,
  color,
  backgroundColor,
  onPress,
}: {
  title: string;
  subtitle: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor, borderColor: color }, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Text style={[styles.cardTitle, { color }]}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      gap: spacing.xs,
    },
    backLink: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
    },
    title: {
      ...typography.displayMd,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      padding: spacing.xl,
      gap: spacing.md,
    },
    cardWrap: {
      flex: 1,
    },
    card: {
      flex: 1,
      borderRadius: radius.lg,
      borderWidth: 2,
      padding: spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
    },
    cardPressed: {
      opacity: 0.8,
    },
    cardTitle: {
      ...typography.subheading,
    },
    cardSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
