import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { HEALTH_EVENT_TYPE_LABELS, useCattleAnimalHealthEvents } from '../../../../../../../src/hooks/useCattleAnimalHealth';
import { useCattleAnimalMovements } from '../../../../../../../src/hooks/useCattleAnimalMovements';
import { useCattleAnimalWeighings } from '../../../../../../../src/hooks/useCattleAnimalWeighings';
import { useCattleAnimal } from '../../../../../../../src/hooks/useCattleAnimals';
import { colors, radius, spacing, typography } from '../../../../../../../src/theme';

export default function AnimalDetailScreen() {
  const { farmId, animalId } = useLocalSearchParams<{ farmId: string; animalId: string }>();
  const { animal, isLoading, reload: reloadAnimal } = useCattleAnimal(animalId);
  const { weighings, reload: reloadWeighings } = useCattleAnimalWeighings(animalId);
  const { events: healthEvents, reload: reloadHealth } = useCattleAnimalHealthEvents(animalId);
  const { movements, reload: reloadMovements } = useCattleAnimalMovements(animalId);

  // Pesagem, saúde e movimentação são cadastradas em rotas separadas.
  useFocusEffect(
    useCallback(() => {
      reloadAnimal();
      reloadWeighings();
      reloadHealth();
      reloadMovements();
    }, [reloadAnimal, reloadWeighings, reloadHealth, reloadMovements])
  );

  if (isLoading || !animal) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={`Brinco ${animal.tag_number}`}
        subtitle={`${animal.lotName ?? 'Sem lote'}${animal.breed ? ` · ${animal.breed}` : ''}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryGrid}>
          <SummaryStat label="Peso atual" value={animal.latestWeightKg !== null ? `${animal.latestWeightKg.toFixed(0)} kg` : '—'} />
          <SummaryStat label="Sexo" value={animal.sex === 'macho' ? 'Macho' : animal.sex === 'femea' ? 'Fêmea' : '—'} />
          <SummaryStat label="Entrada" value={formatDate(animal.entry_date)} />
          <SummaryStat label="Status" value={animal.status === 'ativo' ? 'Ativo' : animal.status} />
        </View>

        <Section title="Pesagens">
          {weighings.length === 0 ? (
            <EmptyState text="Nenhuma pesagem registrada ainda." />
          ) : (
            weighings.map((w) => (
              <Card key={w.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{Number(w.weight_kg).toFixed(0)} kg</Text>
                  <Text style={styles.rowDate}>{formatDate(w.weighed_at)}</Text>
                </View>
                {w.body_condition_score ? <Text style={styles.rowNotes}>Escore: {w.body_condition_score}</Text> : null}
              </Card>
            ))
          )}
          <Button
            label="+ Nova pesagem"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animal/${animalId}/nova-pesagem`)}
          />
        </Section>

        <Section title="Saúde">
          {healthEvents.length === 0 ? (
            <EmptyState text="Nenhum evento de saúde registrado ainda." />
          ) : (
            healthEvents.map((e) => (
              <Card key={e.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{HEALTH_EVENT_TYPE_LABELS[e.event_type]}</Text>
                  <Text style={styles.rowDate}>{formatDate(e.event_date)}</Text>
                </View>
                <Text style={styles.rowNotes}>{e.description}</Text>
              </Card>
            ))
          )}
          <Button
            label="+ Registrar evento de saúde"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animal/${animalId}/novo-evento-saude`)}
          />
        </Section>

        <Section title="Movimentação entre lotes">
          {movements.length === 0 ? (
            <EmptyState text="Este animal ainda não mudou de lote." />
          ) : (
            movements.map((m) => (
              <Card key={m.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>
                    {m.fromLotName ?? 'Entrada'} → {m.toLotName}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(m.moved_at)}</Text>
                </View>
              </Card>
            ))
          )}
          <Button
            label="+ Mover de lote"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animal/${animalId}/mover-lote`)}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
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
    gap: spacing.xxl,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCell: {
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryValue: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  sectionBody: {
    gap: spacing.md,
  },
  rowCard: {
    gap: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  rowDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowNotes: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
