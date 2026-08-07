import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommodityTicker } from '../../../src/components/CommodityTicker';
import { SectorButton } from '../../../src/components/SectorButton';
import { SummaryStat } from '../../../src/components/SummaryStat';
import { useFarm } from '../../../src/hooks/useFarms';
import { colors, spacing, typography } from '../../../src/theme';

export default function FarmHomeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading } = useFarm(farmId);

  return (
    <View style={styles.container}>
      <CommodityTicker />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/farms')} hitSlop={12}>
            <Text style={styles.backLink}>← Trocar fazenda</Text>
          </Pressable>

          {isLoading || !farm ? (
            <ActivityIndicator color={colors.textInverse} style={{ marginTop: spacing.lg }} />
          ) : (
            <>
              <Text style={styles.farmName}>{farm.name}</Text>
              <View style={styles.statsRow}>
                <SummaryStat label="Hectares totais" value={`${farm.totalHectares.toLocaleString('pt-BR')} ha`} />
                <SummaryStat label="Talhões" value={String(farm.totalPlots)} />
                <SummaryStat label="Lavoura" value={`${farm.lavouraHectares.toLocaleString('pt-BR')} ha`} />
                <SummaryStat label="Pecuária" value={`${farm.pecuariaHectares.toLocaleString('pt-BR')} ha`} />
              </View>
            </>
          )}
        </View>

        <View style={styles.sectorsRow}>
          <SectorButton
            title="Lavoura"
            subtitle="Talhões, safras e custos"
            color={colors.lavoura}
            backgroundColor={colors.lavouraLight}
            onPress={() => router.push(`/farms/${farmId}/lavoura`)}
          />
          <SectorButton
            title="Pecuária"
            subtitle="Corte e cria"
            color={colors.pecuaria}
            backgroundColor={colors.pecuariaLight}
            onPress={() => router.push(`/farms/${farmId}/pecuaria`)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  backLink: {
    ...typography.captionMedium,
    color: colors.textInverse,
    opacity: 0.75,
  },
  farmName: {
    ...typography.displayMd,
    color: colors.textInverse,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
  sectorsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
