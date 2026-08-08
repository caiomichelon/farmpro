import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useBreedingCows, type BreedingCowSummary } from '../../../../../src/hooks/useBreedingCows';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function buildColumns(): DataTableColumn<BreedingCowSummary>[] {
  return [
    { key: 'id', label: 'Identificação', width: 130, render: (c) => c.identification },
    { key: 'expected', label: 'Previsão de parto', width: 150, render: (c) => (c.expectedCalvingDate ? formatDate(c.expectedCalvingDate) : '—') },
    { key: 'daysLeft', label: 'Dias restantes', width: 120, render: (c) => (c.expectedCalvingDate ? String(daysUntil(c.expectedCalvingDate)) : '—') },
    { key: 'lastInsem', label: 'Inseminação', width: 130, render: (c) => (c.lastInseminationDate ? formatDate(c.lastInseminationDate) : '—') },
  ];
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function daysUntil(isoDate: string) {
  return Math.round((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
}

/** Matrizes prenhas, ordenadas pela previsão de parto mais próxima primeiro
 * — pra se preparar pra época de parição sem precisar abrir matriz por
 * matriz. */
export default function ExpectedCalvingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error, reload } = useBreedingCows(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const pregnantCows = cows
    .filter((c) => c.isPregnant)
    .sort((a, b) => {
      if (!a.expectedCalvingDate) return 1;
      if (!b.expectedCalvingDate) return -1;
      return new Date(a.expectedCalvingDate).getTime() - new Date(b.expectedCalvingDate).getTime();
    });

  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Partos previstos"
        subtitle={`${pregnantCows.length} ${pregnantCows.length === 1 ? 'matriz prenha' : 'matrizes prenhas'}`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : pregnantCows.length === 0 ? (
        <EmptyState text="Nenhuma matriz prenha no momento." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Partos previstos"
            columns={columns}
            data={pregnantCows}
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
