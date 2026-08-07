import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

export function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
