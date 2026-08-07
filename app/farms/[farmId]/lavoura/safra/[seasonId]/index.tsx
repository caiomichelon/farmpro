import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { SEASON_STATUS_LABELS } from '../../../../../../src/data/seasonStatus';
import { usePlotSeason } from '../../../../../../src/hooks/usePlotSeasons';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

export default function SeasonDetailScreen() {
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  const { season, isLoading } = usePlotSeason(seasonId);

  if (isLoading || !season) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      </SafeAreaView>
    );
  }

  const costPerHectare = season.planted_area_hectares > 0 ? season.totalCost / season.planted_area_hectares : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={season.crop}
        subtitle={`${season.season_label}${season.variety ? ` · ${season.variety}` : ''}`}
      />

      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{SEASON_STATUS_LABELS[season.status]}</Text>
          </View>
          <Text style={styles.areaText}>{Number(season.planted_area_hectares).toLocaleString('pt-BR')} ha</Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryStat label="Custo total" value={formatCurrency(season.totalCost)} />
          <SummaryStat label="Custo / hectare" value={formatCurrency(costPerHectare)} />
          <SummaryStat label="Colhido" value={`${season.totalHarvestedSacas.toLocaleString('pt-BR')} sc`} />
          <SummaryStat
            label="Produtividade"
            value={season.yieldPerHectare !== null ? `${season.yieldPerHectare.toFixed(1)} sc/ha` : '—'}
          />
        </View>

        <NavRow
          title="Custo de produção"
          subtitle="Insumos, defensivo, adubo e mão de obra"
          onPress={() => router.push(`/farms/${farmId}/lavoura/safra/${seasonId}/custos`)}
        />
        <NavRow
          title="Colheita e venda"
          subtitle="Lançamentos por dia e vendas para tradings/cerealistas"
          onPress={() => router.push(`/farms/${farmId}/lavoura/safra/${seasonId}/colheita`)}
        />
      </View>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function NavRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.navRowTitle}>{title}</Text>
        <Text style={styles.navRowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.navRowChevron}>→</Text>
    </Pressable>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: colors.lavouraLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...typography.captionMedium,
    color: colors.lavoura,
  },
  areaText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCell: {
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryValue: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  navRowPressed: {
    opacity: 0.8,
  },
  navRowTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  navRowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  navRowChevron: {
    ...typography.heading,
    color: colors.lavoura,
  },
});
