import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../src/components/DataTable';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { usePlotsWithLatestSeason, type PlotWithLatestSeason } from '../../../../src/hooks/usePlots';
import { spacing, typography, useColors, type Colors } from '../../../../src/theme';

const COLUMNS: DataTableColumn<PlotWithLatestSeason>[] = [
  { key: 'name', label: 'Talhão', width: 140, render: (p) => p.name },
  { key: 'area', label: 'Área (ha)', width: 100, render: (p) => Number(p.area_hectares).toLocaleString('pt-BR') },
  { key: 'crop', label: 'Última cultura', width: 140, render: (p) => p.latestCrop ?? '—' },
  { key: 'season', label: 'Última safra', width: 130, render: (p) => p.latestSeasonLabel ?? '—' },
];

export default function PlotsSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { plots, isLoading, error } = usePlotsWithLatestSeason(farmId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Planilha de talhões"
        subtitle={`${plots.length} ${plots.length === 1 ? 'talhão' : 'talhões'} · arraste para o lado pra ver mais colunas`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : plots.length === 0 ? (
        <EmptyState text="Nenhum talhão cadastrado ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Talhões"
            columns={COLUMNS}
            data={plots}
            keyExtractor={(p) => p.id}
            onRowPress={(p) => router.push(`/farms/${farmId}/lavoura/talhao/${p.id}`)}
          />
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
}
