import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleLots, type CattleLotSummary } from '../../../../../src/hooks/useCattleLots';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function buildColumns(): DataTableColumn<CattleLotSummary>[] {
  return [
    { key: 'name', label: 'Lote', width: 150, render: (l) => l.name },
    {
      key: 'costPerArroba',
      label: 'Custo/@',
      width: 110,
      render: (l) => (l.costPerArroba !== null ? l.costPerArroba.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'),
    },
    { key: 'gmd', label: 'GMD', width: 100, render: (l) => (l.gmdKgPerDay !== null ? `${l.gmdKgPerDay.toFixed(2)} kg/dia` : '—') },
    {
      key: 'costPerHead',
      label: 'Custo/cabeça',
      width: 130,
      render: (l) => l.costPerHead.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    {
      key: 'margin',
      label: 'Margem projetada',
      width: 160,
      render: (l) => l.projectedMargin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    { key: 'head', label: 'Cabeças', width: 90, render: (l) => String(l.currentHeadCount) },
  ];
}

/** Ranking de lotes ativos pelo custo por arroba produzida — do mais barato
 * pro mais caro — pra enxergar de cara qual lote está engordando com mais
 * eficiência e qual está pesando no bolso sem precisar comparar planilha por
 * planilha. */
export default function CorteBenchmarkingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildColumns(), []);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading, error, reload } = useCattleLots(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const rankedLots = lots
    .filter((l) => l.status === 'ativo')
    .sort((a, b) => {
      if (a.costPerArroba === null) return 1;
      if (b.costPerArroba === null) return -1;
      return a.costPerArroba - b.costPerArroba;
    });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Benchmarking"
        subtitle={`${rankedLots.length} ${rankedLots.length === 1 ? 'lote ativo' : 'lotes ativos'} · do custo/@ mais barato pro mais caro`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : rankedLots.length === 0 ? (
        <EmptyState text="Nenhum lote ativo pra comparar ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Benchmarking de lotes"
            columns={columns}
            data={rankedLots}
            keyExtractor={(l) => l.id}
            onRowPress={(l) => router.push(`/farms/${farmId}/pecuaria/corte/lote/${l.id}`)}
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
