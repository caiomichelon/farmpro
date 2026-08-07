import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { useCattleAnimalsByFarm, type CattleAnimalSummary } from '../../../../../../src/hooks/useCattleAnimals';
import { colors, spacing, typography } from '../../../../../../src/theme';

const SEX_LABELS: Record<string, string> = { macho: 'Macho', femea: 'Fêmea' };
const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  vendido: 'Vendido',
  abatido: 'Abatido',
  morto: 'Morto',
};

const COLUMNS: DataTableColumn<CattleAnimalSummary>[] = [
  { key: 'tag', label: 'Brinco', width: 100, render: (a) => a.tag_number },
  { key: 'lot', label: 'Lote', width: 140, render: (a) => a.lotName ?? '—' },
  { key: 'sex', label: 'Sexo', width: 90, render: (a) => (a.sex ? SEX_LABELS[a.sex] : '—') },
  { key: 'breed', label: 'Raça', width: 120, render: (a) => a.breed ?? '—' },
  { key: 'weight', label: 'Peso atual', width: 110, render: (a) => (a.latestWeightKg !== null ? `${a.latestWeightKg.toFixed(0)} kg` : '—') },
  { key: 'status', label: 'Status', width: 100, render: (a) => STATUS_LABELS[a.status] },
];

export default function AllAnimalsSpreadsheetScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { animals, isLoading, error } = useCattleAnimalsByFarm(farmId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Todos os animais"
        subtitle={`${animals.length} ${animals.length === 1 ? 'animal' : 'animais'} · arraste para o lado pra ver mais colunas`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : animals.length === 0 ? (
        <EmptyState text="Nenhum animal individual cadastrado ainda. Cadastre animais dentro de um lote." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            columns={COLUMNS}
            data={animals}
            keyExtractor={(a) => a.id}
            onRowPress={(a) => router.push(`/farms/${farmId}/pecuaria/corte/animal/${a.id}`)}
          />
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
