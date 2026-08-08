import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { CATTLE_LOT_STATUS_LABELS } from '../../../../../../../src/data/cattleOptions';
import { useCattleLot } from '../../../../../../../src/hooks/useCattleLots';
import { useCattleLotWeighings } from '../../../../../../../src/hooks/useCattleLotWeighings';
import { useCattleMortalityEvents } from '../../../../../../../src/hooks/useCattleMortality';
import { useCattleSlaughters } from '../../../../../../../src/hooks/useCattleSlaughters';
import { colors, radius, spacing, typography } from '../../../../../../../src/theme';

export default function LotDetailScreen() {
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { lot, isLoading, reload: reloadLot } = useCattleLot(lotId);
  const { weighings, reload: reloadWeighings } = useCattleLotWeighings(lotId);
  const { events: mortalityEvents, totalDeaths, reload: reloadMortality } = useCattleMortalityEvents(lotId);
  const { slaughters, reload: reloadSlaughters } = useCattleSlaughters(lotId);

  // Pesagem, mortalidade e abate são cadastrados em rotas separadas — refaz
  // tudo ao voltar pra esta tela, senão fica com dado velho até um refresh.
  useFocusEffect(
    useCallback(() => {
      reloadLot();
      reloadWeighings();
      reloadMortality();
      reloadSlaughters();
    }, [reloadLot, reloadWeighings, reloadMortality, reloadSlaughters])
  );

  if (isLoading || !lot) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={lot.name}
        subtitle={`${CATTLE_LOT_STATUS_LABELS[lot.status]} · entrada em ${formatDate(lot.entry_date)}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryGrid}>
          <SummaryStat label="Cabeças atuais" value={String(lot.currentHeadCount)} />
          <SummaryStat label="Peso médio atual" value={`${lot.latestWeightKg.toFixed(0)} kg`} />
          <SummaryStat label="GMD" value={lot.gmdKgPerDay !== null ? `${lot.gmdKgPerDay.toFixed(2)} kg/dia` : '—'} />
          <SummaryStat label="Mortalidade" value={`${lot.mortalityRatePct.toFixed(1)}%`} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.animalsRow, pressed && styles.rowPressed]}
          onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/animais`)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.animalsRowTitle}>Animais individuais</Text>
            <Text style={styles.animalsRowSubtitle}>Ficha com brinco, pesagens, saúde e movimentação por animal</Text>
          </View>
          <Text style={styles.animalsRowChevron}>→</Text>
        </Pressable>

        <Section title="Pesagens do lote" subtitle="Histórico de peso e escore de condição corporal médios">
          {weighings.length === 0 ? (
            <EmptyState text="Nenhuma pesagem registrada ainda." />
          ) : (
            weighings.map((w) => (
              <Card key={w.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{Number(w.avg_weight_kg).toFixed(0)} kg</Text>
                  <Text style={styles.rowDate}>{formatDate(w.weighed_at)}</Text>
                </View>
                {w.body_condition_score ? (
                  <Text style={styles.rowNotes}>Escore de condição corporal: {w.body_condition_score}</Text>
                ) : null}
              </Card>
            ))
          )}
          <Button
            label="+ Nova pesagem"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/nova-pesagem`)}
          />
        </Section>

        <Section title="Mortalidade" subtitle={`${totalDeaths} baixas registradas`}>
          {mortalityEvents.length === 0 ? (
            <EmptyState text="Nenhuma baixa registrada." />
          ) : (
            mortalityEvents.map((m) => (
              <Card key={m.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{m.head_count} cabeça(s)</Text>
                  <Text style={styles.rowDate}>{formatDate(m.event_date)}</Text>
                </View>
                {m.cause ? <Text style={styles.rowNotes}>{m.cause}</Text> : null}
              </Card>
            ))
          )}
          <Button
            label="+ Registrar mortalidade"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/mortalidade`)}
          />
        </Section>

        <Section title="Abate" subtitle="Registro por frigorífico">
          {slaughters.length === 0 ? (
            <EmptyState text="Nenhum abate registrado ainda." />
          ) : (
            slaughters.map((s) => (
              <Card key={s.id} style={styles.rowCard}>
                <View style={styles.rowTopRow}>
                  {s.photo_url ? <Image source={{ uri: s.photo_url }} style={styles.rowThumbnail} /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.rowValue}>{s.slaughterhouseName ?? 'Frigorífico não informado'}</Text>
                      <Text style={styles.rowDate}>{formatDate(s.slaughter_date)}</Text>
                    </View>
                    <Text style={styles.rowNotes}>
                      {s.head_count} cabeças · {Number(s.exit_avg_weight_kg).toFixed(0)} kg méd. ·{' '}
                      {Number(s.price_per_arroba).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/@
                    </Text>
                    {s.next_slaughter_date ? (
                      <Text style={styles.rowNotes}>Próximo abate agendado: {formatDate(s.next_slaughter_date)}</Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))
          )}
          <Button
            label="+ Registrar abate"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/abate`)}
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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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
  rowTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowThumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
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
  animalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.pecuariaLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  rowPressed: {
    opacity: 0.8,
  },
  animalsRowTitle: {
    ...typography.subheading,
    color: colors.pecuaria,
  },
  animalsRowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  animalsRowChevron: {
    ...typography.heading,
    color: colors.pecuaria,
  },
});
