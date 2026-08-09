import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { usePlots } from '../../../../../src/hooks/usePlots';
import { useT } from '../../../../../src/i18n';
import { computePastureStocking, type PastureStockingLevel, type PastureStockingSummary } from '../../../../../src/lib/pastureStocking';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

const LEVEL_COLOR_KEY: Record<PastureStockingLevel, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  ok: 'success',
  atencao: 'warning',
  acima: 'danger',
  sem_limite: 'textMuted',
};

export default function PasturesScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { plots: pastures, isLoading, error, reload, updateMaxStockingRate } = usePlots(farmId, 'pecuaria');
  const { lots, isLoading: isLoadingLots, reload: reloadLots } = useCattleLots(farmId);
  const t = useT();

  useFocusEffect(
    useCallback(() => {
      reload();
      reloadLots();
    }, [reload, reloadLots])
  );

  const activeLots = lots.filter((l) => l.status === 'ativo');
  const summaries = computePastureStocking(
    pastures,
    activeLots.map((l) => ({ plot_id: l.plot_id, currentHeadCount: l.currentHeadCount, latestWeightKg: l.latestWeightKg }))
  );
  const unassignedLots = activeLots.filter((l) => !l.plot_id && l.currentHeadCount > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('pastures.title')} subtitle={t('pastures.subtitle')} />
      {isLoading || isLoadingLots ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {summaries.length === 0 ? (
            <EmptyState text={t('pastures.empty')} />
          ) : (
            summaries.map((summary) => (
              <PastureCard key={summary.plot.id} summary={summary} styles={styles} colors={colors} t={t} onUpdateLimit={updateMaxStockingRate} />
            ))
          )}

          {unassignedLots.length > 0 ? (
            <View style={styles.unassignedBox}>
              <Text style={styles.unassignedTitle}>{t('pastures.unassignedTitle')}</Text>
              <Text style={styles.unassignedSubtitle}>{t('pastures.unassignedSubtitle')}</Text>
              {unassignedLots.map((l) => (
                <Text key={l.id} style={styles.unassignedRow}>
                  • {l.name} — {l.currentHeadCount} {t('pastures.headsSuffix')}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.footer}>
        <Button label={t('pastures.newPasture')} onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/novo-pasto`)} />
      </View>
    </SafeAreaView>
  );
}

function PastureCard({
  summary,
  styles,
  colors,
  t,
  onUpdateLimit,
}: {
  summary: PastureStockingSummary;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
  t: ReturnType<typeof useT>;
  onUpdateLimit: (plotId: string, value: number | null) => Promise<{ error: string | null }>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const levelColor = colors[LEVEL_COLOR_KEY[summary.level]];

  return (
    <Card style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{summary.plot.name}</Text>
        <Text style={styles.cardArea}>{Number(summary.plot.area_hectares).toFixed(1)} ha</Text>
      </View>

      <View style={[styles.levelBadge, { backgroundColor: levelColor + '22' }]}>
        <Text style={[styles.levelBadgeText, { color: levelColor }]}>
          {summary.stockingRateUaHa !== null
            ? t('pastures.stockingRate', { rate: summary.stockingRateUaHa.toFixed(2) })
            : t('pastures.noStockingRate')}
        </Text>
      </View>

      <Text style={styles.cardMeta}>
        {summary.headCount} {t('pastures.headsSuffix')} · {summary.totalUa.toFixed(1)} {t('pastures.uaSuffix')}
      </Text>

      {summary.plot.max_stocking_rate_ua_ha !== null ? (
        <Text style={[styles.levelLabel, { color: summary.stockingRateUaHa !== null ? levelColor : colors.textMuted }]}>
          {summary.stockingRateUaHa !== null
            ? `${t('pastures.limitLabel', { limit: summary.plot.max_stocking_rate_ua_ha })} · ${
                summary.level === 'ok'
                  ? t('pastures.levelOk')
                  : summary.level === 'atencao'
                    ? t('pastures.levelAtencao')
                    : t('pastures.levelAcima')
              }`
            : t('pastures.limitLabel', { limit: summary.plot.max_stocking_rate_ua_ha })}
        </Text>
      ) : (
        <Text style={styles.noLimitText}>{t('pastures.noLimit')}</Text>
      )}

      {isEditing ? (
        <LimitEditForm
          initialValue={summary.plot.max_stocking_rate_ua_ha}
          styles={styles}
          t={t}
          onCancel={() => setIsEditing(false)}
          onSave={async (value) => {
            const { error } = await onUpdateLimit(summary.plot.id, value);
            if (!error) setIsEditing(false);
            return error;
          }}
        />
      ) : (
        <Button label={t('pastures.editLimit')} variant="ghost" onPress={() => setIsEditing(true)} />
      )}
    </Card>
  );
}

function LimitEditForm({
  initialValue,
  styles,
  t,
  onCancel,
  onSave,
}: {
  initialValue: number | null;
  styles: ReturnType<typeof createStyles>;
  t: ReturnType<typeof useT>;
  onCancel: () => void;
  onSave: (value: number | null) => Promise<string | null>;
}) {
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const numeric = value.trim() ? Number(value.replace(',', '.')) : null;
    const saveError = await onSave(numeric);
    setIsSubmitting(false);
    if (saveError) setError(saveError);
  }

  return (
    <View style={styles.editForm}>
      <TextField
        label={t('pastures.limitFormLabel')}
        value={value}
        onChangeText={setValue}
        placeholder={t('pastures.limitFormPlaceholder')}
        keyboardType="decimal-pad"
      />
      <Text style={styles.editFormHelp}>{t('pastures.limitFormHelp')}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.editFormActions}>
        <Button label={t('pastures.cancel')} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={t('pastures.save')} onPress={handleSubmit} loading={isSubmitting} style={{ flex: 1 }} />
      </View>
    </View>
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
    card: {
      gap: spacing.sm,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    cardArea: {
      ...typography.caption,
      color: colors.textMuted,
    },
    levelBadge: {
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    levelBadgeText: {
      ...typography.subheading,
    },
    cardMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    levelLabel: {
      ...typography.captionMedium,
    },
    noLimitText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    editForm: {
      gap: spacing.sm,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    editFormHelp: {
      ...typography.caption,
      color: colors.textMuted,
    },
    editFormActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    unassignedBox: {
      backgroundColor: colors.warningLight,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 2,
    },
    unassignedTitle: {
      ...typography.bodyMedium,
      color: colors.warning,
    },
    unassignedSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    unassignedRow: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}
