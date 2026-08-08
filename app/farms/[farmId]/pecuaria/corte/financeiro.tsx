import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { FinancialSummary } from '../../../../../src/components/FinancialSummary';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleLots, type CattleLotSummary } from '../../../../../src/hooks/useCattleLots';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildColumns(): DataTableColumn<CattleLotSummary>[] {
  return [
    { key: 'name', label: 'Lote', width: 150, render: (l) => l.name },
    { key: 'head', label: 'Cabeças', width: 90, render: (l) => String(l.currentHeadCount) },
    { key: 'cost', label: 'Custo total', width: 130, render: (l) => formatBRL(l.totalCost) },
    { key: 'costPerHead', label: 'Custo/cabeça', width: 130, render: (l) => formatBRL(l.costPerHead) },
    { key: 'arrobas', label: '@ estimadas', width: 110, render: (l) => l.estimatedArrobas.toFixed(1) },
    { key: 'revenue', label: 'Receita projetada', width: 150, render: (l) => formatBRL(l.projectedRevenue) },
    { key: 'margin', label: 'Margem projetada', width: 150, render: (l) => formatBRL(l.projectedMargin) },
  ];
}

/** Planilha financeira consolidada do Corte — custo, receita projetada na
 * cotação atual do boi gordo e margem, lote por lote. Isso não existia antes
 * pra pecuária (só pra lavoura), e era o ponto mais citado como faltante. */
export default function CattleFinancialSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading, error, reload } = useCattleLots(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const activeLots = lots.filter((l) => l.status === 'ativo');
  const totalCost = activeLots.reduce((sum, l) => sum + l.totalCost, 0);
  const totalRevenue = activeLots.reduce((sum, l) => sum + l.projectedRevenue, 0);
  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Financeiro por lote" subtitle={`${activeLots.length} ${activeLots.length === 1 ? 'lote ativo' : 'lotes ativos'}`} />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : activeLots.length === 0 ? (
        <EmptyState text="Nenhum lote ativo ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <FinancialSummary cost={totalCost} revenue={totalRevenue} margin={totalRevenue - totalCost} />
          <Text style={styles.note}>
            Receita projetada na cotação atual do boi gordo — vira valor real só depois do abate de cada lote.
          </Text>
          <DataTable
            title="Financeiro por lote"
            columns={columns}
            data={activeLots}
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
      gap: spacing.md,
    },
    note: {
      ...typography.caption,
      color: colors.textMuted,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
