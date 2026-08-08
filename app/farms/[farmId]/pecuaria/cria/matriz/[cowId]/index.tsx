import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { useCalvings } from '../../../../../../../src/hooks/useCalvings';
import { useCowWeighings } from '../../../../../../../src/hooks/useCowWeighings';
import { useInseminations } from '../../../../../../../src/hooks/useInseminations';
import { fetchDiagnosesByInseminationIds, PREGNANCY_DIAGNOSIS_RESULT_LABELS } from '../../../../../../../src/hooks/usePregnancyDiagnoses';
import {
  COW_CATEGORY_LABELS,
  REPRODUCTIVE_STATUS_LABELS,
  useBreedingCow,
  type ReproductiveStatus,
} from '../../../../../../../src/hooks/useBreedingCows';
import { fetchWeaningsByCalvingIds } from '../../../../../../../src/hooks/useWeanings';
import type { PregnancyDiagnosis, Weaning } from '../../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const STATUS_COLOR_KEY: Record<ReproductiveStatus, 'pecuaria' | 'textMuted' | 'danger' | 'warning'> = {
  aguardando_dg: 'warning',
  prenha_confirmada: 'pecuaria',
  prenha_presumida: 'pecuaria',
  vazia: 'textMuted',
  vazia_atencao: 'danger',
  nunca_coberta: 'textMuted',
};

export default function CowDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, cowId } = useLocalSearchParams<{ farmId: string; cowId: string }>();
  const { cow, isLoading, reload: reloadCow } = useBreedingCow(cowId);
  const { inseminations, reload: reloadInseminations } = useInseminations(cowId);
  const { calvings, reload: reloadCalvings } = useCalvings(cowId);
  const { weighings, reload: reloadWeighings } = useCowWeighings(cowId);

  const [diagnosesByInsemination, setDiagnosesByInsemination] = useState<Record<string, PregnancyDiagnosis>>({});
  const [weaningByCalving, setWeaningByCalving] = useState<Record<string, Weaning>>({});

  useEffect(() => {
    if (inseminations.length === 0) return;
    fetchDiagnosesByInseminationIds(inseminations.map((i) => i.id)).then((all) => {
      const map: Record<string, PregnancyDiagnosis> = {};
      // all já vem ordenado por data desc — a primeira ocorrência de cada
      // inseminação é o diagnóstico mais recente.
      for (const d of all) if (!map[d.insemination_id]) map[d.insemination_id] = d;
      setDiagnosesByInsemination(map);
    });
  }, [inseminations]);

  useEffect(() => {
    if (calvings.length === 0) return;
    fetchWeaningsByCalvingIds(calvings.map((c) => c.id)).then((all) => {
      const map: Record<string, Weaning> = {};
      for (const w of all) map[w.calving_id] = w;
      setWeaningByCalving(map);
    });
  }, [calvings]);

  // Inseminação, DG, parto, desmame e pesagem são cadastrados em rotas separadas.
  useFocusEffect(
    useCallback(() => {
      reloadCow();
      reloadInseminations();
      reloadCalvings();
      reloadWeighings();
    }, [reloadCow, reloadInseminations, reloadCalvings, reloadWeighings])
  );

  if (isLoading || !cow) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  const statusColor = colors[STATUS_COLOR_KEY[cow.reproductiveStatus]];
  const costPerCalf = cow.calfCount > 0 ? cow.totalCost / cow.calfCount : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={cow.identification}
        subtitle={`${COW_CATEGORY_LABELS[cow.category]} · ${cow.calfCount} ${cow.calfCount === 1 ? 'bezerro' : 'bezerros'} até hoje`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.quickActions}>
          <QuickAction label="Inseminar" onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/nova-inseminacao`)} styles={styles} />
          <QuickAction label="DG" onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/diagnostico`)} styles={styles} disabled={!inseminations[0]} />
          <QuickAction label="Parto" onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/novo-parto`)} styles={styles} />
          <QuickAction label="Pesar" onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/nova-pesagem`)} styles={styles} />
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {REPRODUCTIVE_STATUS_LABELS[cow.reproductiveStatus]}
          </Text>
          {cow.isPregnant && cow.expectedCalvingDate ? (
            <Text style={styles.statusSubtext}>Previsão de parto: {formatDate(cow.expectedCalvingDate)}</Text>
          ) : cow.daysEmpty !== null ? (
            <Text style={styles.statusSubtext}>{cow.daysEmpty} dias sem prenhez nova</Text>
          ) : null}
        </View>

        <View style={styles.statsGrid}>
          <StatCell label="Peso atual" value={cow.latestWeightKg !== null ? `${cow.latestWeightKg.toFixed(0)} kg` : '—'} styles={styles} />
          <StatCell label="ECC" value={cow.latestBodyConditionScore !== null ? String(cow.latestBodyConditionScore) : '—'} styles={styles} />
          <StatCell
            label="Intervalo entre partos"
            value={cow.avgCalvingIntervalDays !== null ? `${Math.round(cow.avgCalvingIntervalDays)} dias` : '—'}
            styles={styles}
          />
          <StatCell label="Categoria" value={COW_CATEGORY_LABELS[cow.category]} styles={styles} />
        </View>

        <Card style={styles.financialCard}>
          <Text style={styles.financialTitle}>Custo</Text>
          <View style={styles.financialRow}>
            <View style={styles.financialCell}>
              <Text style={styles.financialLabel}>Custo total</Text>
              <Text style={[styles.financialValue, { color: colors.danger }]}>
                {cow.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCell}>
              <Text style={styles.financialLabel}>Custo por bezerro</Text>
              <Text style={styles.financialValue}>
                {costPerCalf !== null ? costPerCalf.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
              </Text>
            </View>
          </View>
          <Button
            label="+ Lançar custo"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/custos`)}
          />
        </Card>

        <Section title="Inseminações" styles={styles}>
          {inseminations.length === 0 ? (
            <EmptyState text="Nenhuma inseminação registrada ainda." />
          ) : (
            inseminations.map((i) => {
              const diagnosis = diagnosesByInsemination[i.id];
              return (
                <Card key={i.id} style={styles.rowCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.rowValue}>{i.method ?? 'Inseminação'}</Text>
                    <Text style={styles.rowDate}>{formatDate(i.insemination_date)}</Text>
                  </View>
                  {i.veterinarian ? <Text style={styles.rowNotes}>Veterinário: {i.veterinarian}</Text> : null}
                  {i.expected_calving_date ? (
                    <Text style={styles.rowNotes}>Previsão de parto: {formatDate(i.expected_calving_date)}</Text>
                  ) : null}
                  {diagnosis ? (
                    <Text style={styles.rowNotes}>
                      DG: {PREGNANCY_DIAGNOSIS_RESULT_LABELS[diagnosis.result]} em {formatDate(diagnosis.diagnosis_date)}
                    </Text>
                  ) : null}
                </Card>
              );
            })
          )}
        </Section>

        <Section title="Partos" styles={styles}>
          {calvings.length === 0 ? (
            <EmptyState text="Nenhum parto registrado ainda." />
          ) : (
            calvings.map((c) => {
              const weaning = weaningByCalving[c.id];
              return (
                <Card key={c.id} style={styles.rowCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.rowValue}>
                      {c.calf_count} {c.calf_count === 1 ? 'bezerro' : 'bezerros'}
                    </Text>
                    <Text style={styles.rowDate}>{formatDate(c.calving_date)}</Text>
                  </View>
                  {c.calf_identification ? <Text style={styles.rowNotes}>{c.calf_identification}</Text> : null}
                  {weaning ? (
                    <Text style={styles.rowNotes}>
                      Desmame: {weaning.weight_kg !== null ? `${Number(weaning.weight_kg).toFixed(0)} kg` : 'sem peso'} em{' '}
                      {formatDate(weaning.weaning_date)}
                    </Text>
                  ) : (
                    <Pressable
                      onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/desmame?calvingId=${c.id}`)}
                      hitSlop={8}
                    >
                      <Text style={styles.inlineLink}>+ Registrar desmame</Text>
                    </Pressable>
                  )}
                </Card>
              );
            })
          )}
        </Section>

        <Section title="Pesagens" subtitle="Peso e escore de condição corporal (ECC)" styles={styles}>
          {weighings.length === 0 ? (
            <EmptyState text="Nenhuma pesagem registrada ainda." />
          ) : (
            weighings.map((w) => (
              <Card key={w.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{Number(w.weight_kg).toFixed(0)} kg</Text>
                  <Text style={styles.rowDate}>{formatDate(w.weighed_at)}</Text>
                </View>
                {w.body_condition_score !== null ? <Text style={styles.rowNotes}>ECC: {w.body_condition_score}</Text> : null}
              </Card>
            ))
          )}
          <Button
            label="📊 Você, no passado"
            variant="ghost"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/comparativo`)}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  label,
  onPress,
  styles,
  disabled,
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickActionButton, pressed && !disabled && styles.quickActionPressed, disabled && styles.quickActionDisabled]}
      onPress={disabled ? undefined : onPress}
    >
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function StatCell({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, subtitle, children, styles }: { title: string; subtitle?: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
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
    quickActionDisabled: {
      opacity: 0.4,
    },
    quickActionText: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    statusBadge: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: 2,
    },
    statusText: {
      ...typography.subheading,
    },
    statusSubtext: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    statCell: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    statValue: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    financialCard: {
      gap: spacing.md,
    },
    financialTitle: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    financialRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    financialCell: {
      flex: 1,
      gap: 2,
    },
    financialLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    financialValue: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    financialDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
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
    inlineLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
      marginTop: 2,
    },
  });
}
