import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { CATTLE_LOT_READINESS_LABELS, useCattleLot, type CattleLotReadiness } from '../../../../../../../src/hooks/useCattleLots';
import { useCattleLotWeighings } from '../../../../../../../src/hooks/useCattleLotWeighings';
import { useCattleMortalityEvents } from '../../../../../../../src/hooks/useCattleMortality';
import { useCattleSlaughters } from '../../../../../../../src/hooks/useCattleSlaughters';
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
        subtitle={`${CATTLE_LOT_STATUS_LABELS[lot.status]} · entrada em ${formatDate(lot.entry_date)}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.readinessBadge, { backgroundColor: readinessColor + '22', borderColor: readinessColor }]}>
          <Text style={[styles.readinessText, { color: readinessColor }]}>
            {CATTLE_LOT_READINESS_LABELS[lot.readiness]}
          </Text>
          {lot.kgToTarget !== null ? (
            <Text style={styles.readinessSubtext}>
              {lot.kgToTarget > 0
                ? `Faltam ${lot.kgToTarget.toFixed(0)} kg pra meta de ${Number(lot.target_slaughter_weight_kg).toFixed(0)} kg${lot.estimatedExitDate ? ` · previsão: ${formatDate(lot.estimatedExitDate)}` : ''}`
                : `${Math.abs(lot.kgToTarget).toFixed(0)} kg acima da meta de ${Number(lot.target_slaughter_weight_kg).toFixed(0)} kg`}
            </Text>
          ) : (
            <Text style={styles.readinessSubtext}>Sem meta de peso definida</Text>
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
          <Button label="Editar meta e rendimento" variant="ghost" onPress={() => setIsEditingTarget(true)} />
        )}

        <View style={styles.summaryGrid}>
          <SummaryStat label="Cabeças atuais" value={String(lot.currentHeadCount)} styles={styles} />
          <SummaryStat label="Peso médio atual" value={`${lot.latestWeightKg.toFixed(0)} kg`} styles={styles} />
          <SummaryStat label="GMD" value={lot.gmdKgPerDay !== null ? `${lot.gmdKgPerDay.toFixed(2)} kg/dia` : '—'} styles={styles} />
          <SummaryStat label="Mortalidade" value={`${lot.mortalityRatePct.toFixed(1)}%`} styles={styles} />
        </View>

        <Section title="Resultado financeiro" subtitle="Custo lançado x receita projetada na cotação atual do boi gordo" styles={styles}>
          <FinancialSummary cost={lot.totalCost} revenue={lot.projectedRevenue} margin={lot.projectedMargin} />
          <Text style={styles.financialNote}>
            Receita estimada: {lot.estimatedArrobas.toFixed(1)} @ (peso atual × {Number(lot.estimated_carcass_yield_pct).toFixed(0)}%
            de rendimento ÷ 15 kg) — vira valor real só depois do abate.
          </Text>
          <Button
            label="+ Lançar custo"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/custos`)}
          />
          <Button
            label="🎚️ Simular cenários"
            variant="ghost"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/simulador`)}
          />
        </Section>

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

        <Section title="Coletas de campo" subtitle="Checagens de pasto/curral com foto e localização" styles={styles}>
          {collections.length === 0 ? (
            <EmptyState text="Nenhuma coleta registrada ainda." />
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
            label="+ Nova coleta"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/nova-coleta`)}
          />
        </Section>

        <Section title="Pesagens do lote" subtitle="Histórico de peso e escore de condição corporal médios" styles={styles}>
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

        <Section title="Mortalidade" subtitle={`${totalDeaths} baixas registradas`} styles={styles}>
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

        <Section title="Abate" subtitle="Registro por frigorífico" styles={styles}>
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
      <TextField label="Meta de peso pra abate (kg)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="Ex.: 540" />
      <TextField label="Rendimento de carcaça estimado (%)" value={yieldPct} onChangeText={setYieldPct} keyboardType="decimal-pad" placeholder="Ex.: 50" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.editFormActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} style={{ flex: 1 }} />
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
