import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { REPRODUCTIVE_STATUS_LABELS, useBreedingCows, type BreedingCowSummary } from '../../../../../src/hooks/useBreedingCows';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function buildColumns(): DataTableColumn<BreedingCowSummary>[] {
  return [
    { key: 'id', label: 'Identificação', width: 130, render: (c) => c.identification },
    { key: 'status', label: 'Status', width: 150, render: (c) => REPRODUCTIVE_STATUS_LABELS[c.reproductiveStatus] },
    { key: 'calves', label: 'Bezerros', width: 90, render: (c) => String(c.calfCount) },
    { key: 'lastInsem', label: 'Última inseminação', width: 150, render: (c) => (c.lastInseminationDate ? formatDate(c.lastInseminationDate) : '—') },
    { key: 'expected', label: 'Previsão de parto', width: 150, render: (c) => (c.expectedCalvingDate ? formatDate(c.expectedCalvingDate) : '—') },
    { key: 'birth', label: 'Nascimento', width: 110, render: (c) => (c.birth_date ? formatDate(c.birth_date) : '—') },
  ];
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default function CowsSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error } = useBreedingCows(farmId);
  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Todas as matrizes"
        subtitle={`${cows.length} ${cows.length === 1 ? 'matriz' : 'matrizes'} · arraste para o lado pra ver mais colunas`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : cows.length === 0 ? (
        <EmptyState text="Nenhuma matriz cadastrada ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Matrizes"
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
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
