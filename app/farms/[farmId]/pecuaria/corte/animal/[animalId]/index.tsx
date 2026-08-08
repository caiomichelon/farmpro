import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { HEALTH_EVENT_TYPE_LABELS, useCattleAnimalHealthEvents } from '../../../../../../../src/hooks/useCattleAnimalHealth';
import { useCattleAnimalMovements, type CattleAnimalMovementWithNames } from '../../../../../../../src/hooks/useCattleAnimalMovements';
import { useCattleAnimalWeighings } from '../../../../../../../src/hooks/useCattleAnimalWeighings';
import {
  CATTLE_LOT_READINESS_LABELS,
  useCattleAnimal,
  type CattleAnimalSummary,
  type CattleLotReadiness,
} from '../../../../../../../src/hooks/useCattleAnimals';
import type { CattleAnimalHealthEvent, CattleAnimalWeighing } from '../../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const READINESS_COLOR_KEY: Record<CattleLotReadiness, 'success' | 'pecuaria' | 'textMuted'> = {
  pronto: 'success',
  engordando: 'pecuaria',
  recem_chegado: 'textMuted',
};

type TimelineKind = 'entrada' | 'pesagem' | 'saude' | 'movimentacao';

interface TimelineItem {
  id: string;
  date: string;
  /** Timestamp de criação do registro — desempata itens no mesmo dia (a
   * data sozinha só tem granularidade de dia). */
  createdAt: string;
  kind: TimelineKind;
  title: string;
  subtitle?: string;
}

const TIMELINE_KIND_LABELS: Record<TimelineKind, string> = {
  entrada: 'Entrada',
  pesagem: 'Pesagem',
  saude: 'Saúde',
  movimentacao: 'Mudança de lote',
};

const TIMELINE_COLOR_KEY: Record<TimelineKind, 'success' | 'pecuaria' | 'danger' | 'textMuted'> = {
  entrada: 'success',
  pesagem: 'pecuaria',
  saude: 'danger',
  movimentacao: 'textMuted',
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
  const timeline = buildTimeline(animal, weighings, healthEvents, movements);

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

        <Section
          title="Histórico completo"
          subtitle="Tudo o que já aconteceu com este animal, do mais recente pro mais antigo"
          styles={styles}
        >
          {timeline.length === 0 ? (
            <EmptyState text="Nenhum evento registrado ainda." />
          ) : (
            timeline.map((item) => (
              <Card key={item.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <View style={[styles.timelineTag, { backgroundColor: colors[TIMELINE_COLOR_KEY[item.kind]] + '22' }]}>
                    <Text style={[styles.timelineTagText, { color: colors[TIMELINE_COLOR_KEY[item.kind]] }]}>
                      {TIMELINE_KIND_LABELS[item.kind]}
                    </Text>
                  </View>
                  <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.rowValue}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.rowNotes}>{item.subtitle}</Text> : null}
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

function Section({
  title,
  subtitle,
  children,
  styles,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Junta entrada, pesagens, saúde e movimentações entre lotes numa única
 * linha do tempo — o "brinco mostra tudo, onde ele passou", em vez de
 * espalhar o histórico do animal em seções separadas. */
function buildTimeline(
  animal: CattleAnimalSummary,
  weighings: CattleAnimalWeighing[],
  healthEvents: CattleAnimalHealthEvent[],
  movements: CattleAnimalMovementWithNames[]
): TimelineItem[] {
  // O lote de entrada é o de origem da movimentação mais antiga (se o
  // animal já mudou de lote) — animal.lotName é o lote ATUAL, que não é
  // necessariamente onde ele entrou.
  const earliestMovement = movements.reduce<CattleAnimalMovementWithNames | null>((earliest, m) => {
    if (!earliest) return m;
    if (m.moved_at !== earliest.moved_at) return m.moved_at < earliest.moved_at ? m : earliest;
    return m.created_at < earliest.created_at ? m : earliest;
  }, null);
  const entryLotName = earliestMovement?.fromLotName ?? animal.lotName ?? '—';

  const items: TimelineItem[] = [
    {
      id: 'entrada',
      date: animal.entry_date,
      createdAt: animal.created_at,
      kind: 'entrada',
      title: `Entrada no lote ${entryLotName}`,
      subtitle: animal.entry_weight_kg !== null ? `${Number(animal.entry_weight_kg).toFixed(0)} kg` : undefined,
    },
  ];

  for (const w of weighings) {
    items.push({
      id: `pesagem-${w.id}`,
      date: w.weighed_at,
      createdAt: w.created_at,
      kind: 'pesagem',
      title: `${Number(w.weight_kg).toFixed(0)} kg`,
      subtitle: w.body_condition_score !== null ? `Escore: ${w.body_condition_score}` : undefined,
    });
  }

  for (const e of healthEvents) {
    items.push({
      id: `saude-${e.id}`,
      date: e.event_date,
      createdAt: e.created_at,
      kind: 'saude',
      title: `${HEALTH_EVENT_TYPE_LABELS[e.event_type]}: ${e.description}`,
      subtitle: e.next_due_date ? `Próxima dose: ${formatDate(e.next_due_date)}` : undefined,
    });
  }

  for (const m of movements) {
    items.push({
      id: `mov-${m.id}`,
      date: m.moved_at,
      createdAt: m.created_at,
      kind: 'movimentacao',
      title: `${m.fromLotName ?? 'Entrada'} → ${m.toLotName}`,
      subtitle: m.notes ?? undefined,
    });
  }

  // Desempata por data (granularidade de dia) usando o instante real de
  // criação do registro — assim um dia de "processing" (pesar + vacinar +
  // mover tudo junto) aparece na ordem em que realmente aconteceu.
  return items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });
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
    sectionSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
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
    timelineTag: {
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    timelineTagText: {
      ...typography.captionMedium,
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
