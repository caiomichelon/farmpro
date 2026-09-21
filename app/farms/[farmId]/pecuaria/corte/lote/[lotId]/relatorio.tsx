import { useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Button } from '../../../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { useCattleLot } from '../../../../../../../src/hooks/useCattleLots';
import { useCattleLotCosts } from '../../../../../../../src/hooks/useCattleLotCosts';
import { useCattleSlaughters } from '../../../../../../../src/hooks/useCattleSlaughters';
import { useFarm } from '../../../../../../../src/hooks/useFarms';
import { useT } from '../../../../../../../src/i18n';
import { buildLotReportHtml } from '../../../../../../../src/lib/lotReport';
import { generatePdfReport } from '../../../../../../../src/lib/pdfReport';
import { spacing, useColors, type Colors } from '../../../../../../../src/theme';

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

  const isLoading = isLoadingLot || isLoadingCosts || isLoadingSlaughters || !farm || !lot;

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
    });
  }, [farm, lot, costs, slaughters]);

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
