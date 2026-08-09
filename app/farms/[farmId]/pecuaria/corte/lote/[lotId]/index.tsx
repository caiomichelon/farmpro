import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreakEvenCard } from '../../../../../../../src/components/BreakEvenCard';
import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { FinancialSummary } from '../../../../../../../src/components/FinancialSummary';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import {
  CATTLE_FIELD_COLLECTION_CATEGORY_LABELS,
  CATTLE_FIELD_COLLECTION_STATUS_COLOR_KEY,
  CATTLE_FIELD_COLLECTION_STATUS_LABELS,
  CATTLE_LOT_STATUS_LABELS,
} from '../../../../../../../src/data/cattleOptions';
import { useCattleFieldCollections } from '../../../../../../../src/hooks/useCattleFieldCollections';
import { calculateBreakEven } from '../../../../../../../src/lib/breakEven';
import { CATTLE_LOT_READINESS_LABELS, useCattleLot, type CattleLotReadiness } from '../../../../../../../src/hooks/useCattleLots';
import { useCattleLotWeighings } from '../../../../../../../src/hooks/useCattleLotWeighings';
import { useCattleMortalityEvents } from '../../../../../../../src/hooks/useCattleMortality';
import { useCattleSlaughters } from '../../../../../../../src/hooks/useCattleSlaughters';
import { useT } from '../../../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const READINESS_COLOR_KEY: Record<CattleLotReadiness, 'success' | 'pecuaria' | 'textMuted'> = {
  pronto: 'success',
  engordando: 'pecuaria',
  recem_chegado: 'textMuted',
};

export default function LotDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { lot, isLoading, reload: reloadLot, updateTarget } = useCattleLot(lotId);
  const { weighings, reload: reloadWeighings } = useCattleLotWeighings(lotId);
  const { events: mortalityEvents, totalDeaths, reload: reloadMortality } = useCattleMortalityEvents(lotId);
  const { slaughters, reload: reloadSlaughters } = useCattleSlaughters(lotId);
  const { collections, reload: reloadCollections } = useCattleFieldCollections(lotId);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetMarginPct, setTargetMarginPct] = useState('20');
  const t = useT();

  // Pesagem, mortalidade, abate e coleta de campo são cadastrados em rotas
  // separadas — refaz tudo ao voltar pra esta tela, senão fica com dado
  // velho até um refresh.
  useFocusEffect(
    useCallback(() => {
      reloadLot();
      reloadWeighings();
      reloadMortality();
      reloadSlaughters();
      reloadCollections();
    }, [reloadLot, reloadWeighings, reloadMortality, reloadSlaughters, reloadCollections])
  );

  if (isLoading || !lot) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  const readinessColor = colors[READINESS_COLOR_KEY[lot.readiness]];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={lot.name}
        subtitle={t('lotDetail.subtitle', { status: CATTLE_LOT_STATUS_LABELS[lot.status], date: formatDate(lot.entry_date) })}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.readinessBadge, { backgroundColor: readinessColor + '22', borderColor: readinessColor }]}>
          <Text style={[styles.readinessText, { color: readinessColor }]}>
            {CATTLE_LOT_READINESS_LABELS[lot.readiness]}
          </Text>
          {lot.kgToTarget !== null ? (
            <Text style={styles.readinessSubtext}>
              {lot.kgToTarget > 0
                ? t('lotDetail.kgToTargetPositive', {
                    kg: lot.kgToTarget.toFixed(0),
                    target: Number(lot.target_slaughter_weight_kg).toFixed(0),
                    eta: lot.estimatedExitDate ? t('lotDetail.etaSuffix', { date: formatDate(lot.estimatedExitDate) }) : '',
                  })
                : t('lotDetail.kgToTargetNegative', {
                    kg: Math.abs(lot.kgToTarget).toFixed(0),
                    target: Number(lot.target_slaughter_weight_kg).toFixed(0),
                  })}
            </Text>
          ) : (
            <Text style={styles.readinessSubtext}>{t('lotDetail.noTarget')}</Text>
          )}
        </View>

        {isEditingTarget ? (
          <TargetWeightForm
            initialTarget={lot.target_slaughter_weight_kg}
            initialYield={lot.estimated_carcass_yield_pct}
            onCancel={() => setIsEditingTarget(false)}
            onSave={async (target, yieldPct) => {
              const { error } = await updateTarget({
                target_slaughter_weight_kg: target,
                estimated_carcass_yield_pct: yieldPct,
              });
              if (!error) setIsEditingTarget(false);
              return error;
            }}
          />
        ) : (
          <Button label={t('lotDetail.editTarget')} variant="ghost" onPress={() => setIsEditingTarget(true)} />
        )}

        <View style={styles.summaryGrid}>
          <SummaryStat label={t('lotDetail.statCurrentHead')} value={String(lot.currentHeadCount)} styles={styles} />
          <SummaryStat label={t('lotDetail.statCurrentWeight')} value={`${lot.latestWeightKg.toFixed(0)} kg`} styles={styles} />
          <SummaryStat label={t('lotDetail.statGmd')} value={lot.gmdKgPerDay !== null ? `${lot.gmdKgPerDay.toFixed(2)} kg/dia` : '—'} styles={styles} />
          <SummaryStat label={t('lotDetail.statMortality')} value={`${lot.mortalityRatePct.toFixed(1)}%`} styles={styles} />
        </View>

        <Section title={t('lotDetail.financialTitle')} subtitle={t('lotDetail.financialSubtitle')} styles={styles}>
          <FinancialSummary cost={lot.totalCost} revenue={lot.projectedRevenue} margin={lot.projectedMargin} />
          <Text style={styles.financialNote}>
            {t('lotDetail.financialNote', {
              arrobas: lot.estimatedArrobas.toFixed(1),
              yield: Number(lot.estimated_carcass_yield_pct).toFixed(0),
            })}
          </Text>
          <BreakEvenCard
            totalCost={lot.totalCost}
            quantity={lot.estimatedArrobas}
            unitLabel="@"
            targetMarginPct={targetMarginPct}
            onChangeTargetMarginPct={setTargetMarginPct}
          />
          <Button
            label={t('lotDetail.logCost')}
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/custos`)}
          />
          <Button
            label={t('lotDetail.simulate')}
            variant="ghost"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/simulador`)}
          />
        </Section>

        <Pressable
          style={({ pressed }) => [styles.animalsRow, pressed && styles.rowPressed]}
          onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/animais`)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.animalsRowTitle}>{t('lotDetail.animalsTitle')}</Text>
            <Text style={styles.animalsRowSubtitle}>{t('lotDetail.animalsSubtitle')}</Text>
          </View>
          <Text style={styles.animalsRowChevron}>→</Text>
        </Pressable>

        <Section title={t('lotDetail.collectionsTitle')} subtitle={t('lotDetail.collectionsSubtitle')} styles={styles}>
          {collections.length === 0 ? (
            <EmptyState text={t('lotDetail.emptyCollections')} />
          ) : (
            collections.slice(0, 5).map((c) => {
              const statusColor = colors[CATTLE_FIELD_COLLECTION_STATUS_COLOR_KEY[c.status]];
              return (
                <Card key={c.id} style={styles.rowCard}>
                  <View style={styles.rowTopRow}>
                    {c.photo_url ? <Image source={{ uri: c.photo_url }} style={styles.rowThumbnail} /> : null}
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.rowValue}>{CATTLE_FIELD_COLLECTION_CATEGORY_LABELS[c.category]}</Text>
                        <Text style={styles.rowDate}>{formatDateTime(c.collected_at)}</Text>
                      </View>
                      <Text style={[styles.collectionStatus, { color: statusColor }]}>
                        {CATTLE_FIELD_COLLECTION_STATUS_LABELS[c.status]}
                      </Text>
                      {c.notes ? <Text style={styles.rowNotes}>{c.notes}</Text> : null}
                      {c.latitude !== null && c.longitude !== null ? (
                        <Text style={styles.rowNotes}>
                          {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })
          )}
          <Button
            label={t('lotDetail.newCollection')}
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/nova-coleta`)}
          />
          <Button
            label={t('lotDetail.dailyPhoto')}
            variant="ghost"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/foto-diaria`)}
          />
        </Section>

        <Section title={t('lotDetail.weighingsTitle')} subtitle={t('lotDetail.weighingsSubtitle')} styles={styles}>
          {weighings.length === 0 ? (
            <EmptyState text={t('lotDetail.emptyWeighings')} />
          ) : (
            weighings.map((w) => (
              <Card key={w.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{Number(w.avg_weight_kg).toFixed(0)} kg</Text>
                  <Text style={styles.rowDate}>{formatDate(w.weighed_at)}</Text>
                </View>
                {w.body_condition_score ? (
                  <Text style={styles.rowNotes}>{t('lotDetail.bodyCondition', { score: w.body_condition_score })}</Text>
                ) : null}
              </Card>
            ))
          )}
          <Button
            label={t('lotDetail.newWeighing')}
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/nova-pesagem`)}
          />
          <Button
            label={t('lotDetail.pastComparison')}
            variant="ghost"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/comparativo`)}
          />
        </Section>

        <Section title={t('lotDetail.mortalityTitle')} subtitle={t('lotDetail.mortalitySubtitle', { count: totalDeaths })} styles={styles}>
          {mortalityEvents.length === 0 ? (
            <EmptyState text={t('lotDetail.emptyMortality')} />
          ) : (
            mortalityEvents.map((m) => (
              <Card key={m.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{m.head_count} {t('lotDetail.headCountSuffix')}</Text>
                  <Text style={styles.rowDate}>{formatDate(m.event_date)}</Text>
                </View>
                {m.cause ? <Text style={styles.rowNotes}>{m.cause}</Text> : null}
              </Card>
            ))
          )}
          <Button
            label={t('lotDetail.registerMortality')}
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/mortalidade`)}
          />
        </Section>

        <Section title={t('lotDetail.slaughterTitle')} subtitle={t('lotDetail.slaughterSubtitle')} styles={styles}>
          {slaughters.length === 0 ? (
            <EmptyState text={t('lotDetail.emptySlaughter')} />
          ) : (
            slaughters.map((s) => (
              <Card key={s.id} style={styles.rowCard}>
                <View style={styles.rowTopRow}>
                  {s.photo_url ? <Image source={{ uri: s.photo_url }} style={styles.rowThumbnail} /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.rowValue}>{s.slaughterhouseName ?? t('lotDetail.unknownSlaughterhouse')}</Text>
                      <Text style={styles.rowDate}>{formatDate(s.slaughter_date)}</Text>
                    </View>
                    <Text style={styles.rowNotes}>
                      {t('lotDetail.slaughterSummary', {
                        heads: s.head_count,
                        weight: Number(s.exit_avg_weight_kg).toFixed(0),
                        price: Number(s.price_per_arroba).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                      })}
                    </Text>
                    {s.next_slaughter_date ? (
                      <Text style={styles.rowNotes}>
                        {t('lotDetail.nextSlaughterScheduled', { date: formatDate(s.next_slaughter_date) })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))
          )}
          <Button
            label={t('lotDetail.registerSlaughter')}
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/abate`)}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function TargetWeightForm({
  initialTarget,
  initialYield,
  onCancel,
  onSave,
}: {
  initialTarget: number | null;
  initialYield: number;
  onCancel: () => void;
  onSave: (target: number | undefined, yieldPct: number | undefined) => Promise<string | null>;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const [target, setTarget] = useState(initialTarget !== null ? String(initialTarget) : '');
  const [yieldPct, setYieldPct] = useState(String(initialYield));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const targetValue = target ? Number(target.replace(',', '.')) : undefined;
    const yieldValue = yieldPct ? Number(yieldPct.replace(',', '.')) : undefined;
    const saveError = await onSave(targetValue, yieldValue);
    setIsSubmitting(false);
    if (saveError) setError(saveError);
  }

  return (
    <View style={styles.editForm}>
      <TextField label={t('lotDetail.targetWeightLabel')} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="Ex.: 540" />
      <TextField label={t('lotDetail.yieldLabel')} value={yieldPct} onChangeText={setYieldPct} keyboardType="decimal-pad" placeholder="Ex.: 50" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.editFormActions}>
        <Button label={t('lotDetail.cancel')} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={t('lotDetail.save')} onPress={handleSubmit} loading={isSubmitting} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function SummaryStat({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue}>{value}</Text>
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

function formatDateTime(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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
    editForm: {
      gap: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: -spacing.lg,
    },
    editFormActions: {
      flexDirection: 'row',
      gap: spacing.md,
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
    financialNote: {
      ...typography.caption,
      color: colors.textMuted,
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
    collectionStatus: {
      ...typography.captionMedium,
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
    error: {
      color: colors.danger,
    },
  });
}
