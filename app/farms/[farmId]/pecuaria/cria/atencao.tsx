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
    { key: 'days', label: 'Dias vazia', width: 100, render: (c) => String(c.daysEmpty ?? '—') },
    { key: 'calves', label: 'Bezerros', width: 90, render: (c) => String(c.calfCount) },
    { key: 'lastInsem', label: 'Última inseminação', width: 150, render: (c) => (c.lastInseminationDate ? formatDate(c.lastInseminationDate) : '—') },
  ];
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Matrizes vazias há mais de 90 dias sem nova prenhez — a lista de "precisa
 * agir" (reinseminar ou considerar descarte) sem precisar abrir matriz por
 * matriz pra descobrir quem está parada. */
export default function AttentionScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error, reload } = useBreedingCows(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const attentionCows = cows
    .filter((c) => c.reproductiveStatus === 'vazia_atencao')
    .sort((a, b) => (b.daysEmpty ?? 0) - (a.daysEmpty ?? 0));

  const columns = buildColumns();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Atenção"
        subtitle={`${attentionCows.length} ${attentionCows.length === 1 ? 'matriz vazia' : 'matrizes vazias'} há mais de 90 dias`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : attentionCows.length === 0 ? (
        <EmptyState text="Nenhuma matriz vazia há muito tempo agora — tudo em dia." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            columns={columns}
            data={attentionCows}
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
