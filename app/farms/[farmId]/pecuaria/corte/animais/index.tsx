import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import {
  CATTLE_LOT_READINESS_LABELS,
  useCattleAnimalsByFarm,
  type CattleAnimalSummary,
} from '../../../../../../src/hooks/useCattleAnimals';
import { spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

const SEX_LABELS: Record<string, string> = { macho: 'Macho', femea: 'Fêmea' };
const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  vendido: 'Vendido',
  abatido: 'Abatido',
  morto: 'Morto',
};

function buildColumns(): DataTableColumn<CattleAnimalSummary>[] {
  return [
    { key: 'tag', label: 'Brinco', width: 100, render: (a) => a.tag_number },
    { key: 'official_id', label: 'Nº oficial (SISBOV/SIAP)', width: 160, render: (a) => a.official_id_number ?? '—' },
    { key: 'lot', label: 'Lote', width: 140, render: (a) => a.lotName ?? '—' },
    { key: 'sex', label: 'Sexo', width: 90, render: (a) => (a.sex ? SEX_LABELS[a.sex] : '—') },
    { key: 'breed', label: 'Raça', width: 120, render: (a) => a.breed ?? '—' },
    { key: 'weight', label: 'Peso atual', width: 110, render: (a) => (a.latestWeightKg !== null ? `${a.latestWeightKg.toFixed(0)} kg` : '—') },
    { key: 'gmd', label: 'GMD', width: 100, render: (a) => (a.gmdKgPerDay !== null ? `${a.gmdKgPerDay.toFixed(2)} kg/dia` : '—') },
    {
      key: 'readiness',
      label: 'Prontidão',
      width: 130,
      render: (a) => (a.status === 'ativo' ? CATTLE_LOT_READINESS_LABELS[a.readiness] : '—'),
    },
    { key: 'status', label: 'Status', width: 100, render: (a) => STATUS_LABELS[a.status] },
  ];
}

export default function AllAnimalsSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildColumns(), []);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { animals, isLoading, error, reload } = useCattleAnimalsByFarm(farmId);
  const [search, setSearch] = useState('');

  // Animais são cadastrados dentro de um lote, em outra rota — refaz a busca
  // ao focar de novo pra planilha não ficar desatualizada.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const filteredAnimals = search.trim()
    ? animals.filter((a) => {
        const q = search.trim().toLowerCase();
        return a.tag_number.toLowerCase().includes(q) || (a.official_id_number ?? '').toLowerCase().includes(q);
      })
    : animals;

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
          <View style={styles.searchRow}>
            <TextField label="Buscar por brinco ou nº oficial" value={search} onChangeText={setSearch} placeholder="Digite o brinco ou o SISBOV/SIAP" />
          </View>

          {filteredAnimals.length === 0 ? (
            <EmptyState text="Nenhum animal encontrado com essa busca." />
          ) : (
            <DataTable
              title="Todos os animais"
              columns={columns}
              data={filteredAnimals}
              keyExtractor={(a) => a.id}
              onRowPress={(a) => router.push(`/farms/${farmId}/pecuaria/corte/animal/${a.id}`)}
            />
          )}
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
    searchRow: {
      marginBottom: spacing.xs,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
