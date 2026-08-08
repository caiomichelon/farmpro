import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleSlaughtersByFarm, type CattleSlaughterWithLotAndHouse } from '../../../../../src/hooks/useCattleSlaughters';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function buildColumns(): DataTableColumn<CattleSlaughterWithLotAndHouse>[] {
  return [
    { key: 'date', label: 'Data', width: 100, render: (s) => formatDate(s.slaughter_date) },
    { key: 'lot', label: 'Lote', width: 140, render: (s) => s.lotName ?? '—' },
    { key: 'house', label: 'Frigorífico', width: 150, render: (s) => s.slaughterhouseName ?? '—' },
    { key: 'head', label: 'Cabeças', width: 90, render: (s) => String(s.head_count) },
    { key: 'weight', label: 'Peso saída', width: 110, render: (s) => `${Number(s.exit_avg_weight_kg).toFixed(0)} kg` },
    {
      key: 'price',
      label: 'Preço/@',
      width: 110,
      render: (s) => Number(s.price_per_arroba).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    { key: 'yield', label: 'Rend. carcaça', width: 120, render: (s) => (s.carcass_yield_pct !== null ? `${Number(s.carcass_yield_pct).toFixed(1)}%` : '—') },
  ];
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default function SlaughtersSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { slaughters, isLoading, error } = useCattleSlaughtersByFarm(farmId);
  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Planilha de abates"
        subtitle={`${slaughters.length} ${slaughters.length === 1 ? 'abate' : 'abates'} · arraste para o lado pra ver mais colunas`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : slaughters.length === 0 ? (
        <EmptyState text="Nenhum abate registrado ainda em nenhum lote." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable columns={columns} data={slaughters} keyExtractor={(s) => s.id} />
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
