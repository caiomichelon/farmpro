import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { CATTLE_INVENTORY_SUPPLEMENT_CATEGORIES, CATTLE_INVENTORY_UNIT_LABELS, COCHO_PRODUCT_SUGGESTIONS } from '../../../../../src/data/cattleOptions';
import { useCattleInventoryItems, useCattleInventoryMovements } from '../../../../../src/hooks/useCattleInventory';
import { usePlot } from '../../../../../src/hooks/usePlots';
import { usePlotAguadaEvents } from '../../../../../src/hooks/usePlotAguadaEvents';
import { usePlotCercaEvents } from '../../../../../src/hooks/usePlotCercaEvents';
import { usePlotCochoEvents } from '../../../../../src/hooks/usePlotCochoEvents';
import { usePlotForageEvents } from '../../../../../src/hooks/usePlotForageEvents';
import { useT, type TFunction } from '../../../../../src/i18n';
import { computeAguadaFarol, type AguadaFarolStatus } from '../../../../../src/lib/aguadaFarol';
import { computeCercaFarol, type CercaFarolStatus } from '../../../../../src/lib/cercaFarol';
import { computeCochoFarol, type CochoStatus } from '../../../../../src/lib/cochoFarol';
import { computeForageFarol, type ForageStatus } from '../../../../../src/lib/forageFarol';
import type { PlotAguadaStatus, PlotCercaStatus } from '../../../../../src/types/database';
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

const CERCA_COLOR_KEY: Record<CercaFarolStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  boa: 'success',
  atencao: 'warning',
  ruim: 'danger',
  sem_registro: 'textMuted',
};

const FORAGE_COLOR_KEY: Record<ForageStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  em_dia: 'success',
  proximo: 'warning',
  atrasado: 'danger',
  sem_registro: 'textMuted',
};

const AGUADA_STATUS_OPTIONS: PlotAguadaStatus[] = ['boa', 'atencao', 'ruim'];
const CERCA_STATUS_OPTIONS: PlotCercaStatus[] = ['boa', 'atencao', 'ruim'];

/** Piquete: farol do cocho e da aguada (status + histórico de cada um) e
 * formulário pra registrar novos eventos — mesmo padrão de "Registrar
 * mortalidade" (chips de sugestão/opção + campo livre, histórico embaixo). */
export default function PlotDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, plotId } = useLocalSearchParams<{ farmId: string; plotId: string }>();
  const { plot, isLoading: isLoadingPlot, reload: reloadPlot, updateCochoIntervalDays, updateForageMinHeightCm } = usePlot(plotId);
  const cocho = usePlotCochoEvents(plotId);
  const aguada = usePlotAguadaEvents(plotId);
  const cerca = usePlotCercaEvents(plotId);
  const forage = usePlotForageEvents(plotId);
  const { items: stockItems } = useCattleInventoryItems(farmId);
  const supplementStockItems = stockItems.filter((i) => CATTLE_INVENTORY_SUPPLEMENT_CATEGORIES.includes(i.category));

  const [isAddingCocho, setIsAddingCocho] = useState(false);
  const [product, setProduct] = useState('');
  const [sacos, setSacos] = useState('');
  const [stockItemId, setStockItemId] = useState<string | null>(null);
  const stockMovements = useCattleInventoryMovements(stockItemId ?? undefined);
  const [cochoError, setCochoError] = useState<string | null>(null);
  const [isSavingCocho, setIsSavingCocho] = useState(false);

  const [isAddingAguada, setIsAddingAguada] = useState(false);
  const [aguadaStatus, setAguadaStatus] = useState<PlotAguadaStatus | null>(null);
  const [aguadaError, setAguadaError] = useState<string | null>(null);
  const [isSavingAguada, setIsSavingAguada] = useState(false);

  const [isAddingCerca, setIsAddingCerca] = useState(false);
  const [cercaStatus, setCercaStatus] = useState<PlotCercaStatus | null>(null);
  const [cercaError, setCercaError] = useState<string | null>(null);
  const [isSavingCerca, setIsSavingCerca] = useState(false);

  const [isAddingForage, setIsAddingForage] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [forageError, setForageError] = useState<string | null>(null);
  const [isSavingForage, setIsSavingForage] = useState(false);

  const [isEditingInterval, setIsEditingInterval] = useState(false);
  const [intervalInput, setIntervalInput] = useState('');

  const [isEditingMinHeight, setIsEditingMinHeight] = useState(false);
  const [minHeightInput, setMinHeightInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      reloadPlot();
    }, [reloadPlot])
  );

  const isLoading = isLoadingPlot || cocho.isLoading || aguada.isLoading || cerca.isLoading || forage.isLoading || !plot;
  const cochoFarol = plot ? computeCochoFarol(cocho.events[0]?.refilled_at ?? null, plot.cocho_interval_days) : null;
  const aguadaFarol = computeAguadaFarol(aguada.events[0]?.status ?? null);
  const cercaFarol = computeCercaFarol(cerca.events[0]?.status ?? null);
  const forageFarol = plot ? computeForageFarol(forage.events[0]?.height_cm ?? null, plot.forage_min_height_cm) : null;

  async function handleSaveCocho() {
    if (!product.trim()) {
      setCochoError(t('cochoForm.validationError'));
      return;
    }
    setCochoError(null);
    setIsSavingCocho(true);

    // Localização é a evidência de que quem abasteceu passou de verdade no
    // piquete — mesma ideia do ponto digital e das coletas de campo. Se a
    // permissão for negada, o abastecimento ainda é salvo, só sem GPS.
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    } catch {
      // Sem localização disponível agora — segue sem ela.
    }

    const quantity = sacos ? Number(sacos.replace(',', '.')) : undefined;

    const { error: createError } = await cocho.createEvent({
      product,
      sacos: quantity,
      stock_item_id: stockItemId ?? undefined,
      latitude,
      longitude,
    });
    if (createError) {
      setIsSavingCocho(false);
      setCochoError(createError);
      return;
    }

    // Quando um item do estoque foi escolhido, desconta automaticamente a
    // quantidade informada — a saída fica ligada ao piquete pra rastrear
    // quanto saiu pra onde.
    if (stockItemId && quantity) {
      await stockMovements.createMovement({
        type: 'saida',
        quantity,
        plot_id: plotId,
        latitude,
        longitude,
        notes: t('cochoForm.stockMovementNote', { plot: plot?.name ?? '' }),
      });
    }

    setIsSavingCocho(false);
    setProduct('');
    setSacos('');
    setStockItemId(null);
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

  async function handleSaveCerca() {
    if (!cercaStatus) {
      setCercaError(t('cercaForm.validationError'));
      return;
    }
    setCercaError(null);
    setIsSavingCerca(true);
    const { error: createError } = await cerca.createEvent({ status: cercaStatus });
    setIsSavingCerca(false);
    if (createError) {
      setCercaError(createError);
      return;
    }
    setCercaStatus(null);
    setIsAddingCerca(false);
  }

  async function handleSaveForage() {
    const height = Number(heightCm.replace(',', '.'));
    if (!heightCm || Number.isNaN(height) || height < 0) {
      setForageError(t('forageForm.validationError'));
      return;
    }
    setForageError(null);
    setIsSavingForage(true);
    const { error: createError } = await forage.createEvent({ height_cm: height });
    setIsSavingForage(false);
    if (createError) {
      setForageError(createError);
      return;
    }
    setHeightCm('');
    setIsAddingForage(false);
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

  function handleStartEditMinHeight() {
    if (!plot) return;
    setMinHeightInput(String(plot.forage_min_height_cm));
    setIsEditingMinHeight(true);
  }

  async function handleSaveMinHeight() {
    const cm = Number(minHeightInput.replace(',', '.'));
    if (!cm || cm <= 0) return;
    await updateForageMinHeightCm(cm);
    setIsEditingMinHeight(false);
  }

  if (isLoading || !cochoFarol || !forageFarol) {
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

  const cercaStatusColor = colors[CERCA_COLOR_KEY[cercaFarol]];
  const cercaStatusLabel =
    cercaFarol === 'sem_registro'
      ? t('cercaFarol.statusSemRegistro')
      : cercaFarol === 'ruim'
        ? t('cercaFarol.statusRuim')
        : cercaFarol === 'atencao'
          ? t('cercaFarol.statusAtencao')
          : t('cercaFarol.statusBoa');

  const forageStatusColor = colors[FORAGE_COLOR_KEY[forageFarol.status]];
  const forageStatusLabel =
    forageFarol.status === 'sem_registro'
      ? t('forageFarol.statusSemRegistro')
      : forageFarol.status === 'atrasado'
        ? t('forageFarol.statusAtrasado')
        : forageFarol.status === 'proximo'
          ? t('forageFarol.statusProximo')
          : t('forageFarol.statusEmDia');

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
                label={
                  stockItemId
                    ? t('cochoForm.quantityUnitLabel', {
                        unit: CATTLE_INVENTORY_UNIT_LABELS[supplementStockItems.find((i) => i.id === stockItemId)?.unit ?? 'saco'],
                      })
                    : t('cochoForm.sacosLabel')
                }
                value={sacos}
                onChangeText={setSacos}
                keyboardType="decimal-pad"
                placeholder={t('mortality.optional')}
              />
              {supplementStockItems.length > 0 ? (
                <>
                  <ChipSelect
                    label={t('cochoForm.stockItemLabel')}
                    options={supplementStockItems.map((i) => ({ value: i.id, label: i.name }))}
                    value={stockItemId}
                    onChange={(value) => {
                      setStockItemId(value);
                      const picked = supplementStockItems.find((i) => i.id === value);
                      if (picked) setProduct(picked.name);
                    }}
                    accentColor={colors.pecuaria}
                  />
                  {stockItemId ? (
                    <Text style={styles.stockHint}>
                      {t('cochoForm.stockItemHint', {
                        qty: supplementStockItems.find((i) => i.id === stockItemId)?.currentQuantity ?? 0,
                        unit: CATTLE_INVENTORY_UNIT_LABELS[supplementStockItems.find((i) => i.id === stockItemId)?.unit ?? 'saco'],
                      })}
                    </Text>
                  ) : null}
                </>
              ) : null}
              <Text style={styles.locationNote}>{t('cochoForm.locationNote')}</Text>
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

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('plotDetail.cercaSectionTitle')}</Text>

          <View style={[styles.statusBanner, { backgroundColor: cercaStatusColor + '22' }]}>
            <Text style={[styles.statusLabel, { color: cercaStatusColor }]}>{cercaStatusLabel}</Text>
            {cerca.events[0] ? (
              <Text style={styles.statusDetail}>{t('cercaFarol.checkedOn', { date: formatDateBR(cerca.events[0].checked_at) })}</Text>
            ) : null}
          </View>

          {isAddingCerca ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('cercaForm.title')}</Text>
              <ChipSelect
                label={t('cercaForm.statusLabel')}
                options={CERCA_STATUS_OPTIONS.map((s) => ({ value: s, label: t(cercaStatusLabelKey(s)) }))}
                value={cercaStatus}
                onChange={setCercaStatus}
                accentColor={colors.pecuaria}
              />
              {cercaError ? <Text style={styles.errorText}>{cercaError}</Text> : null}
              <View style={styles.formButtons}>
                <Button label={t('cochoForm.cancel')} variant="ghost" onPress={() => setIsAddingCerca(false)} style={{ flex: 1 }} />
                <Button label={t('cochoForm.save')} onPress={handleSaveCerca} loading={isSavingCerca} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Button label={t('cercaFarol.registerButton')} onPress={() => setIsAddingCerca(true)} />
          )}

          <Text style={styles.historyTitle}>{t('cercaHistory.title')}</Text>
          {cerca.events.length === 0 ? (
            <EmptyState text={t('cercaHistory.empty')} />
          ) : (
            cerca.events.map((e) => (
              <Card key={e.id} style={styles.rowCard}>
                <View style={styles.rowTopRow}>
                  <Text style={styles.rowTitle}>{t(cercaStatusLabelKey(e.status))}</Text>
                  <Text style={styles.rowDate}>{formatDateBR(e.checked_at)}</Text>
                </View>
              </Card>
            ))
          )}

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('plotDetail.forageSectionTitle')}</Text>

          <View style={[styles.statusBanner, { backgroundColor: forageStatusColor + '22' }]}>
            <Text style={[styles.statusLabel, { color: forageStatusColor }]}>{forageStatusLabel}</Text>
            {forageFarol.status === 'sem_registro' ? null : (
              <Text style={styles.statusDetail}>
                {t('forageFarol.heightDetail', { height: forageFarol.heightCm ?? 0, min: forageFarol.minHeightCm })}
              </Text>
            )}
          </View>

          <Card style={styles.intervalCard}>
            {isEditingMinHeight ? (
              <View style={styles.intervalEditRow}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('forageFarol.minHeightLabel')}
                    value={minHeightInput}
                    onChangeText={setMinHeightInput}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Button label={t('cochoForm.save')} onPress={handleSaveMinHeight} style={styles.intervalButton} />
                <Button label={t('cochoForm.cancel')} variant="ghost" onPress={() => setIsEditingMinHeight(false)} style={styles.intervalButton} />
              </View>
            ) : (
              <View style={styles.intervalRow}>
                <Text style={styles.intervalText}>{t('forageFarol.minHeightCurrentLabel', { cm: plot.forage_min_height_cm })}</Text>
                <Text style={styles.intervalEditLink} onPress={handleStartEditMinHeight}>
                  ✎ {t('cochoForm.edit')}
                </Text>
              </View>
            )}
          </Card>

          {isAddingForage ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('forageForm.title')}</Text>
              <TextField
                label={t('forageForm.heightLabel')}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
                placeholder={t('forageForm.heightPlaceholder')}
              />
              {forageError ? <Text style={styles.errorText}>{forageError}</Text> : null}
              <View style={styles.formButtons}>
                <Button label={t('cochoForm.cancel')} variant="ghost" onPress={() => setIsAddingForage(false)} style={{ flex: 1 }} />
                <Button label={t('cochoForm.save')} onPress={handleSaveForage} loading={isSavingForage} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Button label={t('forageFarol.registerButton')} onPress={() => setIsAddingForage(true)} />
          )}

          <Text style={styles.historyTitle}>{t('forageHistory.title')}</Text>
          {forage.events.length === 0 ? (
            <EmptyState text={t('forageHistory.empty')} />
          ) : (
            forage.events.map((e) => (
              <Card key={e.id} style={styles.rowCard}>
                <View style={styles.rowTopRow}>
                  <Text style={styles.rowTitle}>{t('forageHistory.heightSuffix', { height: e.height_cm })}</Text>
                  <Text style={styles.rowDate}>{formatDateBR(e.measured_at)}</Text>
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

function cercaStatusLabelKey(status: PlotCercaStatus): Parameters<TFunction>[0] {
  if (status === 'boa') return 'cercaFarol.statusBoa';
  if (status === 'atencao') return 'cercaFarol.statusAtencao';
  return 'cercaFarol.statusRuim';
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
    stockHint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
    },
    locationNote: {
      ...typography.caption,
      color: colors.textMuted,
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
