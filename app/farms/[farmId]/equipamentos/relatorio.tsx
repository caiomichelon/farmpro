import { useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Button } from '../../../../src/components/Button';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useEquipment } from '../../../../src/hooks/useEquipment';
import { useFarm } from '../../../../src/hooks/useFarms';
import { useT } from '../../../../src/i18n';
import { buildEquipmentReportHtml } from '../../../../src/lib/equipmentReport';
import { generatePdfReport } from '../../../../src/lib/pdfReport';
import { spacing, useColors, type Colors } from '../../../../src/theme';

/** Quantos equipamentos de cada tipo a fazenda tem — mesmo padrão de
 * relatório dos setores do gado (WebView/iframe + botão de compartilhar). */
export default function EquipmentReportScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm } = useFarm(farmId);
  const { equipment, isLoading: isLoadingEquipment } = useEquipment(farmId);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const isLoading = isLoadingEquipment || !farm;

  const html = useMemo(() => {
    if (!farm) return null;
    return buildEquipmentReportHtml({
      farmName: farm.name,
      city: farm.city,
      state: farm.state,
      generatedAt: new Date(),
      equipment: equipment.map((e) => ({ name: e.name, type: e.type })),
    });
  }, [farm, equipment]);

  async function handleShare() {
    if (!html) return;
    setIsSharing(true);
    setShareError(null);
    try {
      await generatePdfReport(html, `Relatório de maquinário — FarmPro`);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : t('lotReport.shareError'));
    } finally {
      setIsSharing(false);
    }
  }

  if (isLoading || !html) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('equipmentReport.title')} subtitle={t('equipmentReport.subtitle')} />
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
