import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../src/components/DataTable';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useSeasonsByFarm, type SeasonSummaryWithPlot } from '../../../../src/hooks/usePlotSeasons';
import { spacing, typography, useColors, type Colors } from '../../../../src/theme';

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildColumns(): DataTableColumn<SeasonSummaryWithPlot>[] {
  return [
    { key: 'plot', label: 'Talhão', width: 130, render: (s) => s.plotName },
    { key: 'season', label: 'Safra', width: 110, render: (s) => s.season_label },
    { key: 'crop', label: 'Cultura', width: 110, render: (s) => s.crop },
    {
      key: 'costPerHectare',
      label: 'Custo/ha',
      width: 120,
      render: (s) => (s.costPerHectare !== null ? currency(s.costPerHectare) : '—'),
    },
    {
      key: 'yield',
      label: 'Produtividade',
      width: 130,
      render: (s) => (s.yieldPerHectare !== null ? `${s.yieldPerHectare.toFixed(1)} sc/ha` : '—'),
    },
    { key: 'cost', label: 'Custo total', width: 130, render: (s) => currency(s.totalCost) },
    { key: 'revenue', label: 'Receita', width: 130, render: (s) => currency(s.totalRevenue) },
    { key: 'margin', label: 'Margem', width: 130, render: (s) => currency(s.margin) },
  ];
}

/** Ranking dos talhões/safras pelo custo por hectare — do mais barato pro
 * mais caro — pra ver de cara qual talhão está produzindo com mais
 * eficiência, espelhando o benchmarking já existente em Corte e Cria. Só
 * entra quem já tem algum custo lançado (senão não há o que comparar). */
export default function LavouraBenchmarkingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildColumns(), []);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { seasons, isLoading, error, reload } = useSeasonsByFarm(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const ranked = seasons
    .filter((s) => s.totalCost > 0 && s.costPerHectare !== null)
    .sort((a, b) => (a.costPerHectare ?? 0) - (b.costPerHectare ?? 0));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Benchmarking"
        subtitle={`${ranked.length} ${ranked.length === 1 ? 'safra' : 'safras'} · do custo/ha mais barato pro mais caro`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : ranked.length === 0 ? (
        <EmptyState text="Nenhuma safra com custo lançado ainda pra comparar." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Benchmarking de safras"
            columns={columns}
            data={ranked}
            keyExtractor={(s) => s.id}
            onRowPress={(s) => router.push(`/farms/${farmId}/lavoura/safra/${s.id}`)}
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
