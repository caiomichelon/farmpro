import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { useBreedingCow } from '../../../../../../../src/hooks/useBreedingCows';
import { useCowWeighings } from '../../../../../../../src/hooks/useCowWeighings';
import { buildHistoricalComparisons } from '../../../../../../../src/lib/historicalComparison';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function CowHistoricalComparisonScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cowId } = useLocalSearchParams<{ cowId: string }>();
  const { cow, isLoading: cowLoading } = useBreedingCow(cowId);
  const { weighings, isLoading: weighingsLoading } = useCowWeighings(cowId);

  const isLoading = cowLoading || weighingsLoading;
  const comparisons = buildHistoricalComparisons(
    weighings.map((w) => ({ weighed_at: w.weighed_at, avg_weight_kg: w.weight_kg }))
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Você, no passado"
        subtitle={cow ? `Matriz ${cow.identification} — evolução de peso ao longo do tempo` : 'Evolução de peso ao longo do tempo'}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.pecuaria} />
        ) : comparisons.length === 0 ? (
          <EmptyState text="Ainda não tem pesagens suficientes pra comparar. Volte depois de lançar mais algumas." />
        ) : (
          comparisons.map((c) => (
            <Card key={c.label} style={styles.card}>
              <Text style={styles.cardTitle}>{c.label}</Text>
              <Text style={styles.comparisonRow}>
                {formatDate(c.pastDate)}: {c.pastWeightKg.toFixed(0)} kg → hoje: {c.currentWeightKg.toFixed(0)} kg
              </Text>
              <Text style={[styles.delta, { color: c.deltaKg >= 0 ? colors.success : colors.danger }]}>
                {c.deltaKg >= 0 ? '+' : ''}
                {c.deltaKg.toFixed(0)} kg ({c.deltaPct >= 0 ? '+' : ''}
                {c.deltaPct.toFixed(1)}%)
              </Text>
            </Card>
          ))
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
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    card: {
      gap: spacing.xs,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    comparisonRow: {
      ...typography.body,
      color: colors.textSecondary,
    },
    delta: {
      ...typography.heading,
    },
  });
}
