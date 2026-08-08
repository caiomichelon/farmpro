import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../../src/components/Card';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { useFarm } from '../../../../../src/hooks/useFarms';
import { MIN_BENCHMARK_PARTICIPANTS, useRegionalBenchmarkCorte } from '../../../../../src/hooks/useRegionalBenchmark';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function avg(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

export default function CorteRegionalBenchmarkScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading: farmLoading, updateFarmBenchmarkOptIn } = useFarm(farmId);
  const { lots, isLoading: lotsLoading } = useCattleLots(farmId);
  const { result, isLoading: regionalLoading } = useRegionalBenchmarkCorte(farmId);

  const optedIn = Boolean(farm?.benchmark_opt_in);
  const activeLots = lots.filter((l) => l.status === 'ativo');
  const myGmd = avg(activeLots.map((l) => l.gmdKgPerDay).filter((v): v is number => v !== null));
  const myCostPerArroba = avg(activeLots.map((l) => l.costPerArroba).filter((v): v is number => v !== null));

  const isLoading = farmLoading || lotsLoading || (optedIn && regionalLoading);
  const hasEnoughParticipants = (result?.participant_farm_count ?? 0) >= MIN_BENCHMARK_PARTICIPANTS;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🌎 Comparativo regional" subtitle="Corte — como seus lotes estão em relação a outras fazendas" />
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
              trackColor={{ false: colors.border, true: colors.pecuariaLight }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        {!optedIn ? (
          <Text style={styles.hint}>Ative o compartilhamento acima pra ver a comparação com a região.</Text>
        ) : isLoading ? (
          <ActivityIndicator color={colors.pecuaria} style={styles.loading} />
        ) : !hasEnoughParticipants ? (
          <Text style={styles.hint}>
            Ainda não tem fazendas suficientes participando do Corte nessa região (mínimo {MIN_BENCHMARK_PARTICIPANTS}) pra
            comparar sem quebrar o anonimato. Convide outros produtores a ativar o comparativo regional.
          </Text>
        ) : (
          <>
            <MetricCard
              label="GMD médio (kg/dia)"
              myValue={myGmd !== null ? myGmd.toFixed(2) : '—'}
              regionalValue={result?.regional_avg_gmd_kg_day != null ? result.regional_avg_gmd_kg_day.toFixed(2) : '—'}
              participantCount={result?.participant_farm_count ?? 0}
              better={myGmd !== null && result?.regional_avg_gmd_kg_day != null ? myGmd >= result.regional_avg_gmd_kg_day : null}
              colors={colors}
              styles={styles}
            />
            <MetricCard
              label="Custo por arroba"
              myValue={myCostPerArroba !== null ? myCostPerArroba.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
              regionalValue={
                result?.regional_avg_cost_per_arroba != null
                  ? result.regional_avg_cost_per_arroba.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : '—'
              }
              participantCount={result?.participant_farm_count ?? 0}
              better={
                myCostPerArroba !== null && result?.regional_avg_cost_per_arroba != null
                  ? myCostPerArroba <= result.regional_avg_cost_per_arroba
                  : null
              }
              colors={colors}
              styles={styles}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  myValue,
  regionalValue,
  participantCount,
  better,
  colors,
  styles,
}: {
  label: string;
  myValue: string;
  regionalValue: string;
  participantCount: number;
  better: boolean | null;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Card style={styles.card}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricValue}>{myValue}</Text>
          <Text style={styles.metricCaption}>Você</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricValue}>{regionalValue}</Text>
          <Text style={styles.metricCaption}>Média de {participantCount} fazendas</Text>
        </View>
      </View>
      {better !== null ? (
        <Text style={[styles.metricBadge, { color: better ? colors.success : colors.warning }]}>
          {better ? '✓ Acima da média regional' : 'Abaixo da média regional'}
        </Text>
      ) : null}
    </Card>
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
