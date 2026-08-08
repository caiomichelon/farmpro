import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useOfflineSync } from '../hooks/useOfflineSync';
import { radius, spacing, typography, useColors, type Colors } from '../theme';

/** Aviso discreto de que existem batidas de ponto ou coletas de campo
 * lançadas sem sinal, ainda guardadas no aparelho. Some sozinho quando
 * sincroniza; também oferece um botão manual pra tentar na hora. */
export function OfflineSyncBanner() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📡</Text>
      <View style={styles.textArea}>
        <Text style={styles.title}>
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? 'registro pendente' : 'registros pendentes'} de sincronizar`
            : 'Sincronizando...'}
        </Text>
        <Text style={styles.subtitle}>Ponto e coletas lançados sem sinal — sincroniza sozinho quando a rede voltar.</Text>
      </View>
      {isSyncing ? (
        <ActivityIndicator color={colors.warning} />
      ) : (
        <Pressable onPress={syncNow} hitSlop={8}>
          <Text style={styles.action}>Sincronizar</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: colors.warningLight,
    },
    icon: {
      fontSize: 20,
    },
    textArea: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    action: {
      ...typography.captionMedium,
      color: colors.warning,
    },
  });
}
