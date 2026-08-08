import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { usePlot } from '../../../../../../src/hooks/usePlots';
import { usePlotSeasons, type SeasonSummary } from '../../../../../../src/hooks/usePlotSeasons';
import { SEASON_STATUS_LABELS } from '../../../../../../src/data/seasonStatus';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

export default function PlotDetailScreen() {
  const { farmId, plotId } = useLocalSearchParams<{ farmId: string; plotId: string }>();
  const { plot, isLoading: isLoadingPlot, reload: reloadPlot } = usePlot(plotId);
  const { seasons, isLoading: isLoadingSeasons, error, reload: reloadSeasons } = usePlotSeasons(plotId);

  // "Nova safra" é uma rota separada — refaz a busca ao voltar pra cá.
  useFocusEffect(
    useCallback(() => {
      reloadPlot();
      reloadSeasons();
    }, [reloadPlot, reloadSeasons])
  );

  const harvestedSeasons = seasons.filter((s) => s.yieldPerHectare !== null);
  const averageYield =
    harvestedSeasons.length > 0
      ? harvestedSeasons.reduce((sum, s) => sum + (s.yieldPerHectare ?? 0), 0) / harvestedSeasons.length
      : null;

  const isLoading = isLoadingPlot || isLoadingSeasons;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={plot?.name ?? 'Talhão'}
        subtitle={plot ? `${Number(plot.area_hectares).toLocaleString('pt-BR')} ha` : undefined}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : (
        <FlatList
          data={seasons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.summaryRow}>
              <SummaryChip label="Safras" value={String(seasons.length)} />
              <SummaryChip
                label="Produtividade média"
                value={averageYield !== null ? `${averageYield.toFixed(1)} sc/ha` : '—'}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState text="Nenhuma safra lançada neste talhão ainda. Isso também é o histórico de rotação de cultura — cada safra que você lançar fica registrada aqui." />
          }
          renderItem={({ item }) => (
            <SeasonCard season={item} onPress={() => router.push(`/farms/${farmId}/lavoura/safra/${item.id}`)} />
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button
          label="+ Nova safra"
          onPress={() => router.push(`/farms/${farmId}/lavoura/talhao/${plotId}/nova-safra`)}
        />
        <Button
          label="📊 Você, no passado"
          variant="ghost"
          onPress={() => router.push(`/farms/${farmId}/lavoura/talhao/${plotId}/comparativo`)}
        />
      </View>
    </SafeAreaView>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SeasonCard({ season, onPress }: { season: SeasonSummary; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <View>
          <Text style={styles.cardCrop}>{season.crop}</Text>
          <Text style={styles.cardMeta}>
            {season.season_label}
            {season.variety ? ` · ${season.variety}` : ''}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{SEASON_STATUS_LABELS[season.status]}</Text>
        </View>
      </View>
      <View style={styles.cardStatsRow}>
        <Text style={styles.cardStat}>{Number(season.planted_area_hectares).toLocaleString('pt-BR')} ha</Text>
        <Text style={styles.cardStatDivider}>·</Text>
        <Text style={styles.cardStat}>
          {season.yieldPerHectare !== null ? `${season.yieldPerHectare.toFixed(1)} sc/ha` : 'sem colheita lançada'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: colors.lavouraLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryValue: {
    ...typography.heading,
    color: colors.lavoura,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardCrop: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cardStat: {
    ...typography.captionMedium,
    color: colors.lavoura,
  },
  cardStatDivider: {
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
