import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  accentColor: string;
}

/** Tela provisória para módulos ainda não construídos (Lavoura, Pecuária...). */
export function ModulePlaceholder({ title, description, accentColor }: ModulePlaceholderProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.backLink}>← Voltar</Text>
      </Pressable>
      <View style={styles.content}>
        <View style={[styles.marker, { backgroundColor: accentColor }]} />
        <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  backLink: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  marker: {
    width: 32,
    height: 4,
    borderRadius: 999,
  },
  title: {
    ...typography.displayMd,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
