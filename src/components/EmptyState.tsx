import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useColors, type Colors } from '../theme';

/** Estado vazio padrão do app — um selo com uma marca de "+" e o texto,
 * com uma leve animação de entrada (fade + subida) pra não aparecer seco. */
export function EmptyState({ text }: { text: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.badge}>
        <View style={styles.markHorizontal} />
        <View style={styles.markVertical} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    badge: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markHorizontal: {
      position: 'absolute',
      width: 22,
      height: 3,
      borderRadius: radius.full,
      backgroundColor: colors.textMuted,
    },
    markVertical: {
      position: 'absolute',
      width: 3,
      height: 22,
      borderRadius: radius.full,
      backgroundColor: colors.textMuted,
    },
    text: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
  });
}
