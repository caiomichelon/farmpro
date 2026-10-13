import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { COCHO_PRODUCT_SUGGESTIONS } from '../../../../../src/data/cattleOptions';
import { usePlot } from '../../../../../src/hooks/usePlots';
import { usePlotAguadaEvents } from '../../../../../src/hooks/usePlotAguadaEvents';
import { usePlotCochoEvents } from '../../../../../src/hooks/usePlotCochoEvents';
import { useT, type TFunction } from '../../../../../src/i18n';
import { computeAguadaFarol, type AguadaFarolStatus } from '../../../../../src/lib/aguadaFarol';
import { computeCochoFarol, type CochoStatus } from '../../../../../src/lib/cochoFarol';
import type { PlotAguadaStatus } from '../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const COCHO_COLOR_KEY: Record<CochoStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  em_dia: 'success',
  proximo: 'warning',
  atrasado: 'danger',
  sem_registro: 'textMuted',
};

const AGUADA_COLOR_KEY: Record<AguadaFarolStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  boa: 'success',
  atencao: 'warning',
  ruim: 'danger',
  sem_registro: 'textMuted',
};

const AGUADA_STATUS_OPTIONS: PlotAguadaStatus[] = ['boa', 'atencao', 'ruim'];

/** Piquete: farol do cocho e da aguada (status + histórico de cada um) e
 * formulário pra registrar novos eventos — mesmo padrão de "Registrar
 * mortalidade" (chips de sugestão/opção + campo livre, histórico embaixo). */
export default function PlotDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { plotId } = useLocalSearchParams<{ farmId: string; plotId: string }>();
  const { plot, isLoading: isLoadingPlot, reload: reloadPlot, updateCochoIntervalDays } = usePlot(plotId);
  const cocho = usePlotCochoEvents(plotId);
  const aguada = usePlotAguadaEvents(plotId);

  const [isAddingCocho, setIsAddingCocho] = useState(false);
  const [product, setProduct] = useState('');
  const [sacos, setSacos] = useState('');
  const [cochoError, setCochoError] = useState<string | null>(null);
  const [isSavingCocho, setIsSavingCocho] = useState(false);

  const [isAddingAguada, setIsAddingAguada] = useState(false);
  const [aguadaStatus, setAguadaStatus] = useState<PlotAguadaStatus | null>(null);
  const [aguadaError, setAguadaError] = useState<string | null>(null);
  const [isSavingAguada, setIsSavingAguada] = useState(false);

  const [isEditingInterval, setIsEditingInterval] = useState(false);
  const [intervalInput, setIntervalInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      reloadPlot();
    }, [reloadPlot])
  );

  const isLoading = isLoadingPlot || cocho.isLoading || aguada.isLoading || !plot;
  const cochoFarol = plot ? computeCochoFarol(cocho.events[0]?.refilled_at ?? null, plot.cocho_interval_days) : null;
  const aguadaFarol = computeAguadaFarol(aguada.events[0]?.status ?? null);

  async function handleSaveCocho() {
    if (!product.trim()) {
      setCochoError(t('cochoForm.validationError'));
      return;
    }
    setCochoError(null);
    setIsSavingCocho(true);
    const { error: createError } = await cocho.createEvent({
      product,
      sacos: sacos ? Number(sacos.replace(',', '.')) : undefined,
    });
    setIsSavingCocho(false);
    if (createError) {
      setCochoError(createError);
      return;
    }
    setProduct('');
    setSacos('');
    setIsAddingCocho(false);
  }

  async function handleSaveAguada() {
    if (!aguadaStatus) {
      setAguadaError(t('aguadaForm.validationError'));
      return;
    }
    setAguadaError(null);
    setIsSavingAguada(true);
    const { error: createError } = await aguada.createEvent({ status: aguadaStatus });
    setIsSavingAguada(false);
    if (createError) {
      setAguadaError(createError);
      return;
    }
    setAguadaStatus(null);
    setIsAddingAguada(false);
  }

  function handleStartEditInterval() {
    if (!plot) return;
    setIntervalInput(String(plot.cocho_interval_days));
    setIsEditingInterval(true);
  }

  async function handleSaveInterval() {
    const days = Number(intervalInput);
    if (!days || days <= 0) return;
    await updateCochoIntervalDays(days);
    setIsEditingInterval(false);
  }

  if (isLoading || !cochoFarol) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  const cochoStatusColor = colors[COCHO_COLOR_KEY[cochoFarol.status]];
  const cochoStatusLabel =
    cochoFarol.status === 'sem_registro'
      ? t('cochoFarol.statusSemRegistro')
      : cochoFarol.status === 'atrasado'
        ? t('cochoFarol.statusAtrasado')
        : cochoFarol.status === 'proximo'
          ? t('cochoFarol.statusProximo')
          : t('cochoFarol.statusEmDia');

  const aguadaStatusColor = colors[AGUADA_COLOR_KEY[aguadaFarol]];
  const aguadaStatusLabel =
    aguadaFarol === 'sem_registro'
      ? t('aguadaFarol.statusSemRegistro')
      : aguadaFarol === 'ruim'
        ? t('aguadaFarol.statusRuim')
        : aguadaFarol === 'atencao'
          ? t('aguadaFarol.statusAtencao')
          : t('aguadaFarol.statusBoa');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={plot.name} subtitle={t('plotDetail.areaSuffix', { area: Number(plot.area_hectares).toFixed(1) })} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>{t('plotDetail.cochoSectionTitle')}</Text>

          <View style={[styles.statusBanner, { backgroundColor: cochoStatusColor + '22' }]}>
            <Text style={[styles.statusLabel, { color: cochoStatusColor }]}>{cochoStatusLabel}</Text>
            {cochoFarol.status === 'sem_registro' ? null : cochoFarol.daysUntilDue !== null && cochoFarol.daysUntilDue < 0 ? (
              <Text style={styles.statusDetail}>{t('cochoFarol.overdueDays', { days: Math.abs(cochoFarol.daysUntilDue) })}</Text>
            ) : (
              <Text style={styles.statusDetail}>
                {t('cochoFarol.daysSince', { days: cochoFarol.daysSince ?? 0 })} ·{' '}
                {t('cochoFarol.daysUntilDue', { days: cochoFarol.daysUntilDue ?? 0 })}
              </Text>
            )}
          </View>

          <Card style={styles.intervalCard}>
            {isEditingInterval ? (
              <View style={styles.intervalEditRow}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('cochoFarol.intervalLabel')}
                    value={intervalInput}
                    onChangeText={setIntervalInput}
                    keyboardType="number-pad"
                  />
                </View>
                <Button label={t('cochoForm.save')} onPress={handleSaveInterval} style={styles.intervalButton} />
                <Button label={t('cochoForm.cancel')} variant="ghost" onPress={() => setIsEditingInterval(false)} style={styles.intervalButton} />
              </View>
            ) : (
              <View style={styles.intervalRow}>
                <Text style={styles.intervalText}>{t('cochoFarol.intervalCurrentLabel', { days: plot.cocho_interval_days })}</Text>
                <Text style={styles.intervalEditLink} onPress={handleStartEditInterval}>
                  ✎ {t('cochoForm.edit')}
                </Text>
              </View>
            )}
          </Card>

          {isAddingCocho ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('cochoForm.title')}</Text>
              <ChipSelect
                label={t('cochoForm.productSuggestionsLabel')}
                options={COCHO_PRODUCT_SUGGESTIONS.map((p) => ({ value: p, label: p }))}
                value={product}
                onChange={setProduct}
                accentColor={colors.pecuaria}
              />
              <TextField label={t('cochoForm.productLabel')} value={product} onChangeText={setProduct} placeholder={t('cochoForm.productPlaceholder')} />
              <TextField
                label={t('cochoForm.sacosLabel')}
                value={sacos}
                onChangeText={setSacos}
                keyboardType="decimal-pad"
                placeholder={t('mortality.optional')}
              />
              {cochoError ? <Text style={styles.errorText}>{cochoError}</Text> : null}
              <View style={styles.formButtons}>
                <Button label={t('cochoForm.cancel')} variant="ghost" onPress={() => setIsAddingCocho(false)} style={{ flex: 1 }} />
                <Button label={t('cochoForm.save')} onPress={handleSaveCocho} loading={isSavingCocho} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Button label={t('cochoFarol.registerButton')} onPress={() => setIsAddingCocho(true)} />
          )}

          <Text style={styles.historyTitle}>{t('cochoHistory.title')}</Text>
          {cocho.events.length === 0 ? (
            <EmptyState text={t('cochoHistory.empty')} />
          ) : (
            cocho.events.map((e) => (
              <Card key={e.id} style={styles.rowCard}>
                <View style={styles.rowTopRow}>
                  <Text style={styles.rowTitle}>{e.product ?? t('cochoForm.productPlaceholder')}</Text>
                  <Text style={styles.rowDate}>{formatDateBR(e.refilled_at)}</Text>
                </View>
                {e.sacos !== null ? <Text style={styles.rowSubtitle}>{t('cochoHistory.sacosSuffix', { sacos: e.sacos })}</Text> : null}
              </Card>
            ))
          )}

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('plotDetail.aguadaSectionTitle')}</Text>

          <View style={[styles.statusBanner, { backgroundColor: aguadaStatusColor + '22' }]}>
            <Text style={[styles.statusLabel, { color: aguadaStatusColor }]}>{aguadaStatusLabel}</Text>
            {aguada.events[0] ? (
              <Text style={styles.statusDetail}>{t('aguadaFarol.checkedOn', { date: formatDateBR(aguada.events[0].checked_at) })}</Text>
            ) : null}
          </View>

          {isAddingAguada ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('aguadaForm.title')}</Text>
              <ChipSelect
                label={t('aguadaForm.statusLabel')}
                options={AGUADA_STATUS_OPTIONS.map((s) => ({ value: s, label: t(aguadaStatusLabelKey(s)) }))}
                value={aguadaStatus}
                onChange={setAguadaStatus}
                accentColor={colors.pecuaria}
              />
              {aguadaError ? <Text style={styles.errorText}>{aguadaError}</Text> : null}
              <View style={styles.formButtons}>
                <Button label={t('cochoForm.cancel')} variant="ghost" onPress={() => setIsAddingAguada(false)} style={{ flex: 1 }} />
                <Button label={t('cochoForm.save')} onPress={handleSaveAguada} loading={isSavingAguada} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Button label={t('aguadaFarol.registerButton')} onPress={() => setIsAddingAguada(true)} />
          )}

          <Text style={styles.historyTitle}>{t('aguadaHistory.title')}</Text>
          {aguada.events.length === 0 ? (
            <EmptyState text={t('aguadaHistory.empty')} />
          ) : (
            aguada.events.map((e) => (
              <Card key={e.id} style={styles.rowCard}>
                <View style={styles.rowTopRow}>
                  <Text style={styles.rowTitle}>{t(aguadaStatusLabelKey(e.status))}</Text>
                  <Text style={styles.rowDate}>{formatDateBR(e.checked_at)}</Text>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function aguadaStatusLabelKey(status: PlotAguadaStatus): Parameters<TFunction>[0] {
  if (status === 'boa') return 'aguadaFarol.statusBoa';
  if (status === 'atencao') return 'aguadaFarol.statusAtencao';
  return 'aguadaFarol.statusRuim';
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    sectionTitle: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    sectionTitleSpaced: {
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.lg,
    },
    statusBanner: {
      alignItems: 'center',
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      gap: spacing.xs,
    },
    statusLabel: {
      ...typography.heading,
    },
    statusDetail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    intervalCard: {
      gap: spacing.sm,
      backgroundColor: colors.surface,
    },
    intervalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    intervalText: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
    },
    intervalEditLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    intervalEditRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    intervalButton: {
      height: 48,
    },
    card: {
      gap: spacing.md,
      backgroundColor: colors.surface,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    formButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    errorText: {
      color: colors.danger,
    },
    historyTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    rowCard: {
      gap: 2,
    },
    rowTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rowTitle: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    rowDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
    rowSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
