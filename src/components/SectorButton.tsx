import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useColors, type Colors } from '../theme';

interface SectorButtonProps {
  title: string;
  subtitle: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

export function SectorButton({ title, subtitle, color, backgroundColor, onPress }: SectorButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, { backgroundColor }, pressed && styles.pressed]}
    >
      <View style={[styles.marker, { backgroundColor: color }]} />
      <Text style={[styles.title, { color }]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      minHeight: 132,
      justifyContent: 'flex-end',
    },
    pressed: {
      opacity: 0.85,
    },
    marker: {
      width: 28,
      height: 4,
      borderRadius: radius.full,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.heading,
      marginBottom: spacing.xs / 2,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
