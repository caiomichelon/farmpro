import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../src/components/DataTable';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { SEASON_STATUS_LABELS } from '../../../../src/data/seasonStatus';
import { useSeasonsByFarm, type SeasonSummaryWithPlot } from '../../../../src/hooks/usePlotSeasons';
import { colors, spacing, typography } from '../../../../src/theme';

const COLUMNS: DataTableColumn<SeasonSummaryWithPlot>[] = [
  { key: 'plot', label: 'Talhão', width: 130, render: (s) => s.plotName },
  { key: 'season', label: 'Safra', width: 120, render: (s) => s.season_label },
  { key: 'crop', label: 'Cultura', width: 120, render: (s) => s.crop },
  { key: 'status', label: 'Status', width: 100, render: (s) => SEASON_STATUS_LABELS[s.status] },
  { key: 'area', label: 'Área (ha)', width: 100, render: (s) => Number(s.planted_area_hectares).toLocaleString('pt-BR') },
  { key: 'harvest', label: 'Colhido (sc)', width: 110, render: (s) => s.totalHarvestedSacas.toLocaleString('pt-BR') },
  {
    key: 'yield',
    label: 'Produtividade',
    width: 130,
    render: (s) => (s.yieldPerHectare !== null ? `${s.yieldPerHectare.toFixed(1)} sc/ha` : '—'),
  },
  {
    key: 'cost',
    label: 'Custo total',
    width: 130,
    render: (s) => s.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
];

export default function SeasonsSpreadsheetScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { seasons, isLoading, error } = useSeasonsByFarm(farmId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Planilha de safras"
        subtitle={`${seasons.length} ${seasons.length === 1 ? 'safra' : 'safras'} · arraste para o lado pra ver mais colunas`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : seasons.length === 0 ? (
        <EmptyState text="Nenhuma safra lançada ainda em nenhum talhão." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            columns={COLUMNS}
            data={seasons}
            keyExtractor={(s) => s.id}
            onRowPress={(s) => router.push(`/farms/${farmId}/lavoura/safra/${s.id}`)}
          />
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </SafeAreaView>
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
});
