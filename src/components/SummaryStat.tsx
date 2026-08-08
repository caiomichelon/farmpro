import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography, useColors, type Colors } from '../theme';

export function SummaryStat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      gap: 2,
    },
    value: {
      ...typography.heading,
      color: colors.textInverse,
    },
    label: {
      ...typography.caption,
      color: colors.textInverse,
      opacity: 0.72,
    },
  });
}
