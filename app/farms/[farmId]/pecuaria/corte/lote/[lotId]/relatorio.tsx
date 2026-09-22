import { useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Button } from '../../../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useCattleLot } from '../../../../../../../src/hooks/useCattleLots';
import { useCattleLotCosts } from '../../../../../../../src/hooks/useCattleLotCosts';
import { useCattleSlaughters } from '../../../../../../../src/hooks/useCattleSlaughters';
import { useFarm } from '../../../../../../../src/hooks/useFarms';
import { useT } from '../../../../../../../src/i18n';
import { buildLotReportHtml } from '../../../../../../../src/lib/lotReport';
import { generatePdfReport } from '../../../../../../../src/lib/pdfReport';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

function formatPrice(value: number, currency: 'BRL' | 'USD'): string {
  return currency === 'USD'
    ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Visualização rápida do relatório do lote dentro do próprio app — mesmo
 * HTML usado no PDF, renderizado num WebView (nativo) ou iframe (web), igual
 * ao padrão do LocationMap. O botão de compartilhar/exportar fica à parte,
 * pra abrir o lote e já ver o relatório sem precisar gerar/enviar um arquivo
 * pra alguém primeiro. */
export default function LotReportScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { farm } = useFarm(farmId);
  const { lot, isLoading: isLoadingLot } = useCattleLot(lotId);
  const { costs, isLoading: isLoadingCosts } = useCattleLotCosts(lotId);
  const { slaughters, isLoading: isLoadingSlaughters } = useCattleSlaughters(lotId);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [priceOverride, setPriceOverride] = useState<number | null>(null);

  const isLoading = isLoadingLot || isLoadingCosts || isLoadingSlaughters || !farm || !lot;
  const isRealized = lot?.status === 'abatido' && slaughters.length > 0;

  const html = useMemo(() => {
    if (!farm || !lot) return null;
    return buildLotReportHtml({
      farmName: farm.name,
      city: farm.city,
      state: farm.state,
      generatedAt: new Date(),
      lot,
      costs,
      slaughters,
      priceOverride,
    });
  }, [farm, lot, costs, slaughters, priceOverride]);

  function handleStartEditPrice() {
    if (!lot) return;
    setPriceInput(String(priceOverride ?? lot.pricePerUnit).replace('.', ','));
    setIsEditingPrice(true);
  }

  function handleSavePrice() {
    const parsed = Number(priceInput.replace(',', '.'));
    setPriceOverride(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    setIsEditingPrice(false);
  }

  function handleResetPrice() {
    setPriceOverride(null);
    setIsEditingPrice(false);
  }

  async function handleShare() {
    if (!html || !lot) return;
    setIsSharing(true);
    setShareError(null);
    try {
      await generatePdfReport(html, `Relatório do lote ${lot.name} — FarmPro`);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : t('lotReport.shareError'));
    } finally {
      setIsSharing(false);
    }
  }

  if (isLoading || !html) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('lotReport.title')} subtitle={lot.name} />
      <View style={styles.actionRow}>
        {!isRealized ? (
          isEditingPrice ? (
            <View style={styles.priceEditRow}>
              <View style={styles.priceEditField}>
                <TextField
                  label={t('lotReport.priceLabel', { unit: lot.priceUnit })}
                  value={priceInput}
                  onChangeText={setPriceInput}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
              <Button label={t('lotReport.priceSave')} onPress={handleSavePrice} style={styles.priceEditButton} />
              <Button label={t('lotReport.priceCancel')} variant="ghost" onPress={() => setIsEditingPrice(false)} style={styles.priceEditButton} />
            </View>
          ) : (
            <View style={styles.priceRow}>
              <Text style={styles.priceRowText}>
                {t('lotReport.priceCurrent', { price: formatPrice(priceOverride ?? lot.pricePerUnit, lot.priceCurrency), unit: lot.priceUnit })}
                {priceOverride !== null ? ` · ${t('lotReport.priceEdited')}` : ''}
              </Text>
              <Pressable onPress={handleStartEditPrice} hitSlop={8}>
                <Text style={styles.priceEditLink}>✎ {t('lotReport.priceEdit')}</Text>
              </Pressable>
              {priceOverride !== null ? (
                <Pressable onPress={handleResetPrice} hitSlop={8}>
                  <Text style={styles.priceResetLink}>{t('lotReport.priceReset')}</Text>
                </Pressable>
              ) : null}
            </View>
          )
        ) : null}
        <Button label={t('lotReport.share')} variant="secondary" loading={isSharing} onPress={handleShare} />
        {shareError ? <Text style={styles.error}>{shareError}</Text> : null}
      </View>
      <View style={styles.webviewWrap}>
        {Platform.OS === 'web'
          ? createElement('iframe', { srcDoc: html, style: { border: 0, width: '100%', height: '100%' } })
          : <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} />}
      </View>
    </SafeAreaView>
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
    actionRow: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    error: {
      color: colors.danger,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    priceRowText: {
      ...typography.caption,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    priceEditLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    priceResetLink: {
      ...typography.captionMedium,
      color: colors.textMuted,
    },
    priceEditRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    priceEditField: {
      flex: 1,
    },
    priceEditButton: {
      height: 48,
    },
    webviewWrap: {
      flex: 1,
      backgroundColor: '#F6F5F0',
    },
    webview: {
      flex: 1,
      backgroundColor: 'transparent',
    },
  });
}
