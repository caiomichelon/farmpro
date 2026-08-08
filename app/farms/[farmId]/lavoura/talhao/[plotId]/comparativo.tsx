import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { usePlot } from '../../../../../../src/hooks/usePlots';
import { usePlotSeasons } from '../../../../../../src/hooks/usePlotSeasons';
import { buildLavouraHistoricalComparisons } from '../../../../../../src/lib/lavouraHistoricalComparison';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function PlotHistoricalComparisonScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { plotId } = useLocalSearchParams<{ plotId: string }>();
  const { plot, isLoading: plotLoading } = usePlot(plotId);
  const { seasons, isLoading: seasonsLoading } = usePlotSeasons(plotId);

  const isLoading = plotLoading || seasonsLoading;
  const comparisons = buildLavouraHistoricalComparisons(seasons);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Você, no passado"
        subtitle={plot ? `Talhão ${plot.name} — produtividade ao longo do tempo` : 'Produtividade ao longo do tempo'}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.lavoura} />
        ) : comparisons.length === 0 ? (
          <EmptyState text="Ainda não tem safras colhidas suficientes nesse talhão pra comparar. Volte depois de lançar mais colheitas." />
        ) : (
          comparisons.map((c) => (
            <Card key={c.label} style={styles.card}>
              <Text style={styles.cardTitle}>{c.label}</Text>
              <Text style={styles.comparisonRow}>
                {c.pastCrop} ({c.pastSeasonLabel}, {formatDate(c.pastDate)}): {c.pastYield.toFixed(1)} sc/ha
              </Text>
              <Text style={styles.comparisonRow}>
                {c.currentCrop} ({c.currentSeasonLabel}, hoje): {c.currentYield.toFixed(1)} sc/ha
              </Text>
              <Text style={[styles.delta, { color: c.deltaSacasPerHa >= 0 ? colors.success : colors.danger }]}>
                {c.deltaSacasPerHa >= 0 ? '+' : ''}
                {c.deltaSacasPerHa.toFixed(1)} sc/ha ({c.deltaPct >= 0 ? '+' : ''}
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
