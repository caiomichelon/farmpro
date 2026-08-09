import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { useCattleLot } from '../../../../../../../src/hooks/useCattleLots';
import { useCattleLotWeighings } from '../../../../../../../src/hooks/useCattleLotWeighings';
import { useT } from '../../../../../../../src/i18n';
import { buildHistoricalComparisons } from '../../../../../../../src/lib/historicalComparison';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function HistoricalComparisonScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { lot, isLoading: lotLoading } = useCattleLot(lotId);
  const { weighings, isLoading: weighingsLoading } = useCattleLotWeighings(lotId);
  const t = useT();

  const isLoading = lotLoading || weighingsLoading;
  const comparisons = buildHistoricalComparisons(weighings);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('lotComparison.title')}
        subtitle={lot ? t('lotComparison.subtitleWithLot', { name: lot.name }) : t('lotComparison.subtitle')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.pecuaria} />
        ) : comparisons.length === 0 ? (
          <EmptyState text={t('lotComparison.empty')} />
        ) : (
          comparisons.map((c) => (
            <Card key={c.label} style={styles.card}>
              <Text style={styles.cardTitle}>{c.label}</Text>
              <Text style={styles.comparisonRow}>
                {t('lotComparison.row', { date: formatDate(c.pastDate), past: c.pastWeightKg.toFixed(0), current: c.currentWeightKg.toFixed(0) })}
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
