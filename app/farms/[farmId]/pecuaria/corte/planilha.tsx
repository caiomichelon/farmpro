import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { CATTLE_LOT_STATUS_LABELS } from '../../../../../src/data/cattleOptions';
import { useCattleLots, type CattleLotSummary } from '../../../../../src/hooks/useCattleLots';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function buildColumns(): DataTableColumn<CattleLotSummary>[] {
  return [
    { key: 'name', label: 'Lote', width: 150, render: (l) => l.name },
    { key: 'status', label: 'Status', width: 90, render: (l) => CATTLE_LOT_STATUS_LABELS[l.status] },
    { key: 'head', label: 'Cabeças', width: 90, render: (l) => String(l.currentHeadCount) },
    { key: 'weight', label: 'Peso médio', width: 110, render: (l) => `${l.latestWeightKg.toFixed(0)} kg` },
    { key: 'gmd', label: 'GMD', width: 110, render: (l) => (l.gmdKgPerDay !== null ? `${l.gmdKgPerDay.toFixed(2)} kg/dia` : '—') },
    { key: 'mortality', label: 'Mortalidade', width: 110, render: (l) => `${l.mortalityRatePct.toFixed(1)}%` },
    { key: 'exitDate', label: 'Previsão de saída', width: 130, render: (l) => (l.estimatedExitDate ? formatDate(l.estimatedExitDate) : '—') },
    { key: 'entry', label: 'Entrada', width: 110, render: (l) => formatDate(l.entry_date) },
  ];
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default function LotsSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading, error } = useCattleLots(farmId);
  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Planilha de lotes"
        subtitle={`${lots.length} ${lots.length === 1 ? 'lote' : 'lotes'} · arraste para o lado pra ver mais colunas`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : lots.length === 0 ? (
        <EmptyState text="Nenhum lote cadastrado ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Lotes"
            columns={columns}
            data={lots}
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
