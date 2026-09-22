import { useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Button } from '../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleActivityGroups } from '../../../../../src/hooks/useCattleActivityGroups';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { useFarm } from '../../../../../src/hooks/useFarms';
import { useT } from '../../../../../src/i18n';
import { buildCattleSectorsReportHtml } from '../../../../../src/lib/cattleSectorsReport';
import { generatePdfReport } from '../../../../../src/lib/pdfReport';
import { spacing, useColors, type Colors } from '../../../../../src/theme';

/** Visão geral de onde está cada grupo de gado agora — mesmo padrão de
 * relatório do lote (WebView/iframe + botão de compartilhar), só que
 * juntando semi-confinamento e todos os setores leves num quadro só. */
export default function CattleSectorsReportScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm } = useFarm(farmId);
  const { lots, isLoading: isLoadingLots } = useCattleLots(farmId);
  const { groups, isLoading: isLoadingGroups } = useCattleActivityGroups(farmId);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const isLoading = isLoadingLots || isLoadingGroups || !farm;

  const html = useMemo(() => {
    if (!farm) return null;
    const activeLots = lots.filter((l) => l.status === 'ativo');
    return buildCattleSectorsReportHtml({
      farmName: farm.name,
      city: farm.city,
      state: farm.state,
      generatedAt: new Date(),
      semiHeadCount: activeLots.reduce((sum, l) => sum + l.currentHeadCount, 0),
      semiActiveLotCount: activeLots.length,
      groups: groups.map((g) => ({
        sector_name: g.sector_name,
        head_count: g.head_count,
        notes: g.notes,
        updated_at: g.updated_at,
      })),
    });
  }, [farm, lots, groups]);

  async function handleShare() {
    if (!html) return;
    setIsSharing(true);
    setShareError(null);
    try {
      await generatePdfReport(html, `Relatório de setores — FarmPro`);
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
      <ScreenHeader title={t('cattleSectorsReport.title')} subtitle={t('cattleSectorsReport.subtitle')} />
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
