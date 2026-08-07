import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export interface Stat {
  label: string;
  value: string;
}

/** Grade de indicadores em destaque (2 colunas) — usada nas telas principais
 * de Corte e Cria pra mostrar números relevantes assim que a tela abre, sem
 * precisar entrar em nada. */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.cell}>
          <Text style={styles.value} numberOfLines={1}>
            {stat.value}
          </Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  value: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
