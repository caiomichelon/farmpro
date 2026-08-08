import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { HEALTH_EVENT_TYPE_LABELS, useCattleAnimalHealthEvents } from '../../../../../../../src/hooks/useCattleAnimalHealth';
import { useCattleAnimalMovements } from '../../../../../../../src/hooks/useCattleAnimalMovements';
import { useCattleAnimalWeighings } from '../../../../../../../src/hooks/useCattleAnimalWeighings';
import {
  CATTLE_LOT_READINESS_LABELS,
  useCattleAnimal,
  type CattleLotReadiness,
} from '../../../../../../../src/hooks/useCattleAnimals';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const READINESS_COLOR_KEY: Record<CattleLotReadiness, 'success' | 'pecuaria' | 'textMuted'> = {
  pronto: 'success',
  engordando: 'pecuaria',
  recem_chegado: 'textMuted',
};

export default function AnimalDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const readinessColor = colors[READINESS_COLOR_KEY[animal.readiness]];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={`Brinco ${animal.tag_number}`}
        subtitle={`${animal.lotName ?? 'Sem lote'}${animal.breed ? ` · ${animal.breed}` : ''}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.quickActions}>
          <QuickAction label="Pesar" onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animal/${animalId}/nova-pesagem`)} styles={styles} />
          <QuickAction label="Saúde" onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animal/${animalId}/novo-evento-saude`)} styles={styles} />
          <QuickAction label="Mover lote" onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animal/${animalId}/mover-lote`)} styles={styles} />
        </View>

        {animal.status === 'ativo' ? (
          <View style={[styles.readinessBadge, { backgroundColor: readinessColor + '22', borderColor: readinessColor }]}>
            <Text style={[styles.readinessText, { color: readinessColor }]}>
              {CATTLE_LOT_READINESS_LABELS[animal.readiness]}
            </Text>
            {animal.kgToTarget !== null ? (
              <Text style={styles.readinessSubtext}>
                {animal.kgToTarget > 0 ? `Faltam ${animal.kgToTarget.toFixed(0)} kg pra meta do lote` : `${Math.abs(animal.kgToTarget).toFixed(0)} kg acima da meta`}
              </Text>
            ) : (
              <Text style={styles.readinessSubtext}>Lote sem meta de peso definida</Text>
            )}
          </View>
        ) : null}

        {animal.hasOverdueHealth ? (
          <View style={styles.healthAlert}>
            <Text style={styles.healthAlertText}>⚠ Tem dose de vacina/tratamento vencida</Text>
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryStat label="Peso atual" value={animal.latestWeightKg !== null ? `${animal.latestWeightKg.toFixed(0)} kg` : '—'} styles={styles} />
          <SummaryStat label="GMD" value={animal.gmdKgPerDay !== null ? `${animal.gmdKgPerDay.toFixed(2)} kg/dia` : '—'} styles={styles} />
          <SummaryStat label="Sexo" value={animal.sex === 'macho' ? 'Macho' : animal.sex === 'femea' ? 'Fêmea' : '—'} styles={styles} />
          <SummaryStat label="Entrada" value={formatDate(animal.entry_date)} styles={styles} />
        </View>

        <Section title="Pesagens" styles={styles}>
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
        </Section>

        <Section title="Saúde" styles={styles}>
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
                {e.next_due_date ? (
                  <Text style={styles.rowNotes}>Próxima dose: {formatDate(e.next_due_date)}</Text>
                ) : null}
              </Card>
            ))
          )}
        </Section>

        <Section title="Movimentação entre lotes" styles={styles}>
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
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ label, onPress, styles }: { label: string; onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickActionButton, pressed && styles.quickActionPressed]} onPress={onPress}>
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function SummaryStat({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
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
      gap: spacing.xxl,
    },
    quickActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    quickActionButton: {
      flex: 1,
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    quickActionPressed: {
      opacity: 0.7,
    },
    quickActionText: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    readinessBadge: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: 2,
    },
    readinessText: {
      ...typography.subheading,
    },
    readinessSubtext: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    healthAlert: {
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    healthAlertText: {
      ...typography.captionMedium,
      color: colors.danger,
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
}
