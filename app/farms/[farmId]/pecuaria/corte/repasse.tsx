import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleAnimalsByFarm, type CattleAnimalSummary } from '../../../../../src/hooks/useCattleAnimals';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function buildColumns(): DataTableColumn<CattleAnimalSummary>[] {
  return [
    { key: 'tag', label: 'Brinco', width: 100, render: (a) => a.tag_number },
    { key: 'lot', label: 'Lote', width: 140, render: (a) => a.lotName ?? '—' },
    { key: 'weight', label: 'Peso atual', width: 110, render: (a) => (a.latestWeightKg !== null ? `${a.latestWeightKg.toFixed(0)} kg` : '—') },
    { key: 'over', label: 'Acima da meta', width: 120, render: (a) => (a.kgToTarget !== null ? `${Math.abs(a.kgToTarget).toFixed(0)} kg` : '—') },
    { key: 'gmd', label: 'GMD', width: 100, render: (a) => (a.gmdKgPerDay !== null ? `${a.gmdKgPerDay.toFixed(2)} kg/dia` : '—') },
  ];
}

/** "Repasse": animais que já bateram a meta individualmente, mas estão em
 * lotes que ainda não estão prontos como um todo — candidatos a venda
 * seletiva/antecipada sem esperar o lote inteiro engordar. */
export default function RepasseScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildColumns(), []);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { animals, isLoading: animalsLoading, error, reload: reloadAnimals } = useCattleAnimalsByFarm(farmId);
  const { lots, isLoading: lotsLoading, reload: reloadLots } = useCattleLots(farmId);

  useFocusEffect(
    useCallback(() => {
      reloadAnimals();
      reloadLots();
    }, [reloadAnimals, reloadLots])
  );

  const isLoading = animalsLoading || lotsLoading;
  const lotReadinessById = new Map(lots.map((l) => [l.id, l.readiness]));

  const repasseAnimals = animals
    .filter((a) => a.status === 'ativo' && a.readiness === 'pronto' && lotReadinessById.get(a.lot_id) !== 'pronto')
    .sort((a, b) => (b.kgToTarget !== null && a.kgToTarget !== null ? a.kgToTarget - b.kgToTarget : 0));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Repasse"
        subtitle={`${repasseAnimals.length} ${repasseAnimals.length === 1 ? 'animal pronto' : 'animais prontos'} em lotes ainda não prontos`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : repasseAnimals.length === 0 ? (
        <EmptyState text="Nenhum animal pronto individualmente dentro de um lote ainda em engorda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Repasse"
            columns={columns}
            data={repasseAnimals}
            keyExtractor={(a) => a.id}
            onRowPress={(a) => router.push(`/farms/${farmId}/pecuaria/corte/animal/${a.id}`)}
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
