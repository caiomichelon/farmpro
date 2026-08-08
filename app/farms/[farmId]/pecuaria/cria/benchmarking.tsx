import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useBreedingCows, type BreedingCowSummary } from '../../../../../src/hooks/useBreedingCows';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function costPerCalfOf(cow: BreedingCowSummary): number | null {
  return cow.calfCount > 0 ? cow.totalCost / cow.calfCount : null;
}

function buildColumns(): DataTableColumn<BreedingCowSummary>[] {
  return [
    { key: 'id', label: 'Identificação', width: 130, render: (c) => c.identification },
    { key: 'costPerCalf', label: 'Custo/bezerro', width: 140, render: (c) => (costPerCalfOf(c) !== null ? formatBRL(costPerCalfOf(c)!) : '—') },
    { key: 'calves', label: 'Bezerros', width: 90, render: (c) => String(c.calfCount) },
    { key: 'interval', label: 'Intervalo entre partos', width: 170, render: (c) => (c.avgCalvingIntervalDays !== null ? `${Math.round(c.avgCalvingIntervalDays)} dias` : '—') },
  ];
}

/** Ranking das matrizes com pelo menos um bezerro, do custo por bezerro mais
 * baixo pro mais alto — mostra de cara quais matrizes estão sendo mais
 * eficientes (e quais estão custando caro pra pouco retorno). */
export default function CriaBenchmarkingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildColumns(), []);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error, reload } = useBreedingCows(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const rankedCows = cows
    .filter((c) => c.calfCount > 0)
    .sort((a, b) => (costPerCalfOf(a) ?? 0) - (costPerCalfOf(b) ?? 0));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Benchmarking"
        subtitle={`${rankedCows.length} ${rankedCows.length === 1 ? 'matriz com bezerro' : 'matrizes com bezerro'} · do custo/bezerro mais baixo pro mais alto`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : rankedCows.length === 0 ? (
        <EmptyState text="Nenhuma matriz com bezerro registrado ainda pra comparar." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Benchmarking de matrizes"
            columns={columns}
            data={rankedCows}
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
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
