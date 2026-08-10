import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeSlideIn } from '../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useT } from '../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

export default function PecuariaHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const t = useT();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('pecuariaHome.title')} subtitle={t('pecuariaHome.subtitle')} />

      <View style={styles.content}>
        <FadeSlideIn>
          <AreaCard
            title={t('pecuariaHome.corteTitle')}
            description={t('pecuariaHome.corteDescription')}
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte`)}
            styles={styles}
          />
        </FadeSlideIn>
        <FadeSlideIn delay={70}>
          <AreaCard
            title={t('pecuariaHome.criaTitle')}
            description={t('pecuariaHome.criaDescription')}
            onPress={() => router.push(`/farms/${farmId}/pecuaria/cria`)}
            styles={styles}
          />
        </FadeSlideIn>
        <FadeSlideIn delay={140}>
          <AreaCard
            title={t('pecuariaHome.estoqueTitle')}
            description={t('pecuariaHome.estoqueDescription')}
            onPress={() => router.push(`/farms/${farmId}/pecuaria/estoque`)}
            styles={styles}
          />
        </FadeSlideIn>
      </View>
    </SafeAreaView>
  );
}

function AreaCard({
  title,
  description,
  onPress,
  styles,
}: {
  title: string;
  description: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.marker} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.pecuariaLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardPressed: {
    opacity: 0.85,
  },
  marker: {
    width: 28,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.pecuaria,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.pecuaria,
    marginBottom: spacing.xs / 2,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  });
}
