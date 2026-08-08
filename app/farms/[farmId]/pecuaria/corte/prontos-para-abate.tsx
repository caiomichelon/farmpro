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
    { key: 'head', label: 'Cabeças', width: 90, render: (l) => String(l.currentHeadCount) },
    { key: 'weight', label: 'Peso atual', width: 110, render: (l) => `${l.latestWeightKg.toFixed(0)} kg` },
    {
      key: 'target',
      label: 'Meta',
      width: 110,
      render: (l) => (l.target_slaughter_weight_kg !== null ? `${Number(l.target_slaughter_weight_kg).toFixed(0)} kg` : '—'),
    },
    {
      key: 'over',
      label: 'Acima da meta',
      width: 120,
      render: (l) => (l.kgToTarget !== null ? `${Math.abs(l.kgToTarget).toFixed(0)} kg` : '—'),
    },
    { key: 'arrobas', label: '@ estimadas', width: 110, render: (l) => l.estimatedArrobas.toFixed(1) },
    {
      key: 'revenue',
      label: 'Receita projetada',
      width: 150,
      render: (l) => l.projectedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    { key: 'days', label: 'Dias no lote', width: 110, render: (l) => String(l.daysInLot) },
  ];
}

/** Planilha das "colheitas prontas" da pecuária: lotes que já bateram a
 * meta de peso, ordenados pelos mais acima da meta primeiro — é a lista de
 * "vender agora" sem precisar abrir lote por lote. */
export default function ReadyForSlaughterScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading, error, reload } = useCattleLots(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const readyLots = lots
    .filter((l) => l.status === 'ativo' && l.readiness === 'pronto')
    .sort((a, b) => (a.kgToTarget ?? 0) - (b.kgToTarget ?? 0));

  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Prontos pra abate"
        subtitle={`${readyLots.length} ${readyLots.length === 1 ? 'lote' : 'lotes'} bateram a meta de peso`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : readyLots.length === 0 ? (
        <EmptyState text="Nenhum lote bateu a meta de peso ainda. Defina uma meta em cada lote pra acompanhar aqui." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            columns={columns}
            data={readyLots}
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
