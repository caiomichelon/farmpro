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
import { usePlotCochoEvents } from '../../../../../src/hooks/usePlotCochoEvents';
import { useT } from '../../../../../src/i18n';
import { computeCochoFarol, type CochoStatus } from '../../../../../src/lib/cochoFarol';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const STATUS_COLOR_KEY: Record<CochoStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  em_dia: 'success',
  proximo: 'warning',
  atrasado: 'danger',
  sem_registro: 'textMuted',
};

/** Piquete: farol do cocho (status + histórico) e formulário pra registrar
 * um novo abastecimento — mesmo padrão de "Registrar mortalidade" (chips de
 * sugestão + campo livre, lista do histórico embaixo). */
export default function PlotDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { plotId } = useLocalSearchParams<{ farmId: string; plotId: string }>();
  const { plot, isLoading: isLoadingPlot, reload: reloadPlot, updateCochoIntervalDays } = usePlot(plotId);
  const { events, isLoading: isLoadingEvents, createEvent } = usePlotCochoEvents(plotId);

  const [isAdding, setIsAdding] = useState(false);
  const [product, setProduct] = useState('');
  const [sacos, setSacos] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingInterval, setIsEditingInterval] = useState(false);
  const [intervalInput, setIntervalInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      reloadPlot();
    }, [reloadPlot])
  );

  const isLoading = isLoadingPlot || isLoadingEvents || !plot;
  const farol = plot ? computeCochoFarol(events[0]?.refilled_at ?? null, plot.cocho_interval_days) : null;

  async function handleSave() {
    if (!product.trim()) {
      setError(t('cochoForm.validationError'));
      return;
    }
    setError(null);
    setIsSaving(true);
    const { error: createError } = await createEvent({
      product,
      sacos: sacos ? Number(sacos.replace(',', '.')) : undefined,
    });
    setIsSaving(false);
    if (createError) {
      setError(createError);
      return;
    }
    setProduct('');
    setSacos('');
    setIsAdding(false);
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

  if (isLoading || !farol) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  const statusColor = colors[STATUS_COLOR_KEY[farol.status]];
  const statusLabel =
    farol.status === 'sem_registro'
      ? t('cochoFarol.statusSemRegistro')
      : farol.status === 'atrasado'
        ? t('cochoFarol.statusAtrasado')
        : farol.status === 'proximo'
          ? t('cochoFarol.statusProximo')
          : t('cochoFarol.statusEmDia');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={plot.name} subtitle={t('plotDetail.areaSuffix', { area: Number(plot.area_hectares).toFixed(1) })} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.statusBanner, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            {farol.status === 'sem_registro' ? null : farol.daysUntilDue !== null && farol.daysUntilDue < 0 ? (
              <Text style={styles.statusDetail}>{t('cochoFarol.overdueDays', { days: Math.abs(farol.daysUntilDue) })}</Text>
            ) : (
              <Text style={styles.statusDetail}>
                {t('cochoFarol.daysSince', { days: farol.daysSince ?? 0 })} · {t('cochoFarol.daysUntilDue', { days: farol.daysUntilDue ?? 0 })}
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

          {isAdding ? (
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
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.formButtons}>
                <Button label={t('cochoForm.cancel')} variant="ghost" onPress={() => setIsAdding(false)} style={{ flex: 1 }} />
                <Button label={t('cochoForm.save')} onPress={handleSave} loading={isSaving} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Button label={t('cochoFarol.registerButton')} onPress={() => setIsAdding(true)} />
          )}

          <Text style={styles.historyTitle}>{t('cochoHistory.title')}</Text>
          {events.length === 0 ? (
            <EmptyState text={t('cochoHistory.empty')} />
          ) : (
            events.map((e) => (
              <Card key={e.id} style={styles.rowCard}>
                <View style={styles.rowTopRow}>
                  <Text style={styles.rowTitle}>{e.product ?? t('cochoForm.productPlaceholder')}</Text>
                  <Text style={styles.rowDate}>{formatDateBR(e.refilled_at)}</Text>
                </View>
                {e.sacos !== null ? <Text style={styles.rowSubtitle}>{t('cochoHistory.sacosSuffix', { sacos: e.sacos })}</Text> : null}
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
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
