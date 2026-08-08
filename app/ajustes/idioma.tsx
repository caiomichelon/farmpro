import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useLocale, useT, type Locale } from '../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../src/theme';

const OPTIONS: { value: Locale; label: string; native: string }[] = [
  { value: 'pt', label: 'Português', native: 'Português (Brasil)' },
  { value: 'en', label: 'English', native: 'English' },
  { value: 'es', label: 'Español', native: 'Español' },
];

export default function IdiomaScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('settings.language')} subtitle={t('settings.language.subtitle')} />
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const selected = locale === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => setLocale(option.value)}
            >
              <Text style={styles.rowTitle}>{option.native}</Text>
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
      justifyContent: 'space-between',
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
