import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import {
  HEALTH_EVENT_TYPE_LABELS,
  useCattleHealthPendingByFarm,
  type CattleHealthEventWithAnimal,
} from '../../../../../src/hooks/useCattleAnimalHealth';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function daysFromToday(isoDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((new Date(isoDate).getTime() - new Date(today).getTime()) / 86_400_000);
}

function situationLabel(nextDueDate: string) {
  const days = daysFromToday(nextDueDate);
  if (days < 0) return `Vencida há ${Math.abs(days)}d`;
  if (days === 0) return 'Vence hoje';
  return `Em ${days}d`;
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function buildColumns(): DataTableColumn<CattleHealthEventWithAnimal>[] {
  return [
    { key: 'tag', label: 'Brinco', width: 100, render: (e) => e.animalTagNumber },
    { key: 'lot', label: 'Lote', width: 140, render: (e) => e.lotName ?? '—' },
    { key: 'type', label: 'Tipo', width: 100, render: (e) => HEALTH_EVENT_TYPE_LABELS[e.event_type] },
    { key: 'desc', label: 'Descrição', width: 160, render: (e) => e.description },
    { key: 'due', label: 'Próxima dose', width: 110, render: (e) => (e.next_due_date ? formatDate(e.next_due_date) : '—') },
    { key: 'situation', label: 'Situação', width: 130, render: (e) => (e.next_due_date ? situationLabel(e.next_due_date) : '—') },
  ];
}

/** Doses/retornos de saúde marcados (vacina, tratamento) de todos os animais
 * da fazenda, ordenados da mais vencida pra mais distante — pra não deixar
 * passar reforço de vacina ou retorno de tratamento. */
export default function PendingVaccinesScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildColumns(), []);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { events, isLoading, error, reload } = useCattleHealthPendingByFarm(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const overdueCount = events.filter((e) => e.next_due_date && daysFromToday(e.next_due_date) < 0).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Vacinas pendentes"
        subtitle={`${events.length} ${events.length === 1 ? 'pendência' : 'pendências'}${overdueCount > 0 ? ` · ${overdueCount} vencida${overdueCount === 1 ? '' : 's'}` : ''}`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : events.length === 0 ? (
        <EmptyState text="Nenhuma dose ou retorno marcado ainda. Registre a próxima dose ao cadastrar um evento de saúde." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Vacinas pendentes"
            columns={columns}
            data={events}
            keyExtractor={(e) => e.id}
            onRowPress={(e) => router.push(`/farms/${farmId}/pecuaria/corte/animal/${e.animal_id}`)}
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
