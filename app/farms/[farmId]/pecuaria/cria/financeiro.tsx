import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useBreedingCows, type BreedingCowSummary } from '../../../../../src/hooks/useBreedingCows';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildColumns(): DataTableColumn<BreedingCowSummary>[] {
  return [
    { key: 'id', label: 'Identificação', width: 130, render: (c) => c.identification },
    { key: 'calves', label: 'Bezerros', width: 90, render: (c) => String(c.calfCount) },
    { key: 'cost', label: 'Custo total', width: 130, render: (c) => formatBRL(c.totalCost) },
    {
      key: 'costPerCalf',
      label: 'Custo/bezerro',
      width: 140,
      render: (c) => (c.calfCount > 0 ? formatBRL(c.totalCost / c.calfCount) : '—'),
    },
  ];
}

/** Planilha financeira consolidada da Cria — custo total e custo por
 * bezerro produzido, matriz a matriz. Não existia nenhum controle de custo
 * pra cria antes, só pra lavoura. */
export default function BreedingFinancialSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error, reload } = useBreedingCows(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const totalCost = cows.reduce((sum, c) => sum + c.totalCost, 0);
  const totalCalves = cows.reduce((sum, c) => sum + c.calfCount, 0);
  const costPerCalf = totalCalves > 0 ? totalCost / totalCalves : null;
  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Financeiro por matriz" subtitle={`${cows.length} ${cows.length === 1 ? 'matriz' : 'matrizes'}`} />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : cows.length === 0 ? (
        <EmptyState text="Nenhuma matriz cadastrada ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Custo total</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>{formatBRL(totalCost)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Custo por bezerro</Text>
              <Text style={styles.summaryValue}>{costPerCalf !== null ? formatBRL(costPerCalf) : '—'}</Text>
            </View>
          </View>
          <DataTable
            title="Financeiro por matriz"
            columns={columns}
            data={cows}
            keyExtractor={(c) => c.id}
            onRowPress={(c) => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${c.id}`)}
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
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: spacing.md,
    },
    summaryCell: {
      flex: 1,
      gap: 2,
    },
    summaryLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    summaryValue: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    summaryDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
