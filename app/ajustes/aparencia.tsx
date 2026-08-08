import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemePreference } from '../../src/context/ThemeContext';
import { useT, type TFunction } from '../../src/i18n';
import { radius, spacing, typography, useColors, type Colors, type ThemePreference } from '../../src/theme';

function buildOptions(t: TFunction): { value: ThemePreference; label: string; description: string }[] {
  return [
    { value: 'system', label: t('settings.appearance.system'), description: t('settings.appearance.systemDescription') },
    { value: 'light', label: t('settings.appearance.light'), description: t('settings.appearance.lightDescription') },
    { value: 'dark', label: t('settings.appearance.dark'), description: t('settings.appearance.darkDescription') },
  ];
}

export default function AparenciaScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const options = buildOptions(t);
  const { preference, setPreference } = useThemePreference();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('settings.appearance')} subtitle={t('settings.appearance.subtitle')} />
      <View style={styles.list}>
        {options.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => setPreference(option.value)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{option.label}</Text>
                <Text style={styles.rowSubtitle}>{option.description}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
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
      borderRadius: radius.lg,
    },
    rowSelected: {
      borderColor: colors.primary,
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
    radio: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
    },
  });
}
