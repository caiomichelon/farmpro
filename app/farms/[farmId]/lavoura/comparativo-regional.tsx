import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../src/components/Card';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useFarm } from '../../../../src/hooks/useFarms';
import { useSeasonsByFarm } from '../../../../src/hooks/usePlotSeasons';
import { MIN_BENCHMARK_PARTICIPANTS, useRegionalBenchmarkLavoura } from '../../../../src/hooks/useRegionalBenchmark';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

export default function LavouraRegionalBenchmarkScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading: farmLoading, updateFarmBenchmarkOptIn } = useFarm(farmId);
  const { seasons, isLoading: seasonsLoading } = useSeasonsByFarm(farmId);
  const { result, isLoading: regionalLoading } = useRegionalBenchmarkLavoura(farmId);

  const optedIn = Boolean(farm?.benchmark_opt_in);
  const harvestedYields = seasons
    .filter((s) => s.status === 'colhida' && s.yieldPerHectare !== null)
    .map((s) => s.yieldPerHectare as number);
  const myYield = harvestedYields.length > 0 ? harvestedYields.reduce((sum, v) => sum + v, 0) / harvestedYields.length : null;

  const isLoading = farmLoading || seasonsLoading || (optedIn && regionalLoading);
  const hasEnoughParticipants = (result?.participant_farm_count ?? 0) >= MIN_BENCHMARK_PARTICIPANTS;
  const regionalYield = result?.regional_avg_yield_sacas_ha ?? null;
  const better = myYield !== null && regionalYield !== null ? myYield >= regionalYield : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🌎 Comparativo regional" subtitle="Lavoura — como sua produtividade está em relação a outras fazendas" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Compartilhar dados anônimos</Text>
              <Text style={styles.toggleSubtitle}>
                Sua fazenda entra na média regional (nunca aparece separada) e você passa a ver a média das outras.
              </Text>
            </View>
            <Switch
              value={optedIn}
              onValueChange={(value) => {
                if (farmId) updateFarmBenchmarkOptIn(farmId, value);
              }}
              trackColor={{ false: colors.border, true: colors.lavouraLight }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        {!optedIn ? (
          <Text style={styles.hint}>Ative o compartilhamento acima pra ver a comparação com a região.</Text>
        ) : isLoading ? (
          <ActivityIndicator color={colors.lavoura} style={styles.loading} />
        ) : !hasEnoughParticipants ? (
          <Text style={styles.hint}>
            Ainda não tem fazendas suficientes participando da Lavoura nessa região (mínimo {MIN_BENCHMARK_PARTICIPANTS}) pra
            comparar sem quebrar o anonimato. Convide outros produtores a ativar o comparativo regional.
          </Text>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.metricLabel}>Produtividade média (sacas/ha)</Text>
            <View style={styles.metricRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricValue}>{myYield !== null ? `${myYield.toFixed(1)} sc/ha` : '—'}</Text>
                <Text style={styles.metricCaption}>Você</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricValue}>{regionalYield !== null ? `${regionalYield.toFixed(1)} sc/ha` : '—'}</Text>
                <Text style={styles.metricCaption}>Média de {result?.participant_farm_count ?? 0} fazendas</Text>
              </View>
            </View>
            {better !== null ? (
              <Text style={[styles.metricBadge, { color: better ? colors.success : colors.warning }]}>
                {better ? '✓ Acima da média regional' : 'Abaixo da média regional'}
              </Text>
            ) : null}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
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
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    card: {
      gap: spacing.sm,
      borderRadius: radius.md,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    toggleTitle: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    toggleSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    loading: {
      marginTop: spacing.xl,
    },
    metricLabel: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    metricRow: {
      flexDirection: 'row',
      gap: spacing.xl,
    },
    metricCol: {
      flex: 1,
      gap: 2,
    },
    metricValue: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    metricCaption: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    metricBadge: {
      ...typography.captionMedium,
    },
  });
}
