import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useT, type TFunction } from '../../src/i18n';
import { spacing, typography, useColors, type Colors } from '../../src/theme';

function buildItems(t: TFunction) {
  return [
    { title: t('settings.account'), subtitle: t('settings.accountSubtitle'), href: '/ajustes/conta', marker: 'primary' },
    { title: t('settings.appearance'), subtitle: t('settings.appearanceSubtitle'), href: '/ajustes/aparencia', marker: 'lavoura' },
    { title: t('settings.notifications'), subtitle: t('settings.notificationsSubtitle'), href: '/ajustes/notificacoes', marker: 'pecuaria' },
    { title: t('settings.language'), subtitle: t('settings.languageSubtitle'), href: '/ajustes/idioma', marker: 'funcionarios' },
  ] as const;
}

export default function AjustesScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const items = buildItems(t);
  const markerColor: Record<string, string> = {
    primary: colors.primary,
    lavoura: colors.lavoura,
    pecuaria: colors.pecuaria,
    funcionarios: colors.funcionarios,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.href}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(item.href as never)}
          >
            <View style={[styles.marker, { backgroundColor: markerColor[item.marker] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
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
      borderRadius: 14,
    },
    rowPressed: {
      opacity: 0.8,
    },
    marker: {
      width: 4,
      height: 32,
      borderRadius: 999,
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
    chevron: {
      ...typography.heading,
      color: colors.textMuted,
    },
  });
}
