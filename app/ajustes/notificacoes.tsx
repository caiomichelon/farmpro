import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useProfile } from '../../src/hooks/useProfile';
import { useT, type TFunction } from '../../src/i18n';
import type { AlertPreferenceKey } from '../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../src/theme';

function buildItems(t: TFunction): { key: AlertPreferenceKey; title: string; description: string }[] {
  return [
    {
      key: 'documentos',
      title: t('settings.notifications.documents'),
      description: t('settings.notifications.documentsDescription'),
    },
    {
      key: 'mortalidade',
      title: t('settings.notifications.mortality'),
      description: t('settings.notifications.mortalityDescription'),
    },
    {
      key: 'peso_lote',
      title: t('settings.notifications.weight'),
      description: t('settings.notifications.weightDescription'),
    },
    {
      key: 'financeiro_safra',
      title: t('settings.notifications.finance'),
      description: t('settings.notifications.financeDescription'),
    },
    {
      key: 'vacina_pendente',
      title: t('settings.notifications.vaccine'),
      description: t('settings.notifications.vaccineDescription'),
    },
    {
      key: 'parto_previsto',
      title: t('settings.notifications.calving'),
      description: t('settings.notifications.calvingDescription'),
    },
    {
      key: 'clima',
      title: t('settings.notifications.weather'),
      description: t('settings.notifications.weatherDescription'),
    },
    {
      key: 'abigeato',
      title: t('settings.notifications.theft'),
      description: t('settings.notifications.theftDescription'),
    },
    {
      key: 'cocho_baixo',
      title: t('settings.notifications.trough'),
      description: t('settings.notifications.troughDescription'),
    },
    {
      key: 'boletim_diario',
      title: t('settings.notifications.briefing'),
      description: t('settings.notifications.briefingDescription'),
    },
    {
      key: 'fechamento_diario',
      title: t('settings.notifications.closing'),
      description: t('settings.notifications.closingDescription'),
    },
  ];
}

export default function NotificacoesScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const items = buildItems(t);
  const { profile, isLoading, isAlertEnabled, updateAlertPreferences } = useProfile();
  const [savingKey, setSavingKey] = useState<AlertPreferenceKey | null>(null);

  async function handleToggle(key: AlertPreferenceKey, value: boolean) {
    setSavingKey(key);
    await updateAlertPreferences({ ...profile?.alert_preferences, [key]: value });
    setSavingKey(null);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('settings.notifications')} subtitle={t('settings.notifications.subtitle')} />
      <Text style={styles.note}>{t('settings.notifications.note')}</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            style={styles.row}
            onPress={() => handleToggle(item.key, !isAlertEnabled(item.key))}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.description}</Text>
            </View>
            <Switch
              value={isAlertEnabled(item.key)}
              onValueChange={(value) => handleToggle(item.key, value)}
              disabled={savingKey === item.key}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.surface}
            />
          </Pressable>
        ))}
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
    note: {
      ...typography.caption,
      color: colors.textSecondary,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    list: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
    },
    rowTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    rowSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}
