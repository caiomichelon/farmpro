import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/** Resultado financeiro (custo x receita x margem) — pensado pra ser o
 * ponto que mais diferencia o FarmPro de planilha solta: em vez de só
 * contar registros, mostra se aquilo tá dando lucro ou prejuízo, de
 * cara, sem precisar abrir relatório nenhum. */
export function FinancialSummary({ cost, revenue, margin }: { cost: number; revenue: number; margin: number }) {
  const isPositive = margin >= 0;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultado financeiro</Text>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Custo</Text>
          <Text style={[styles.cellValue, { color: colors.danger }]}>{formatBRL(cost)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Receita</Text>
          <Text style={[styles.cellValue, { color: colors.success }]}>{formatBRL(revenue)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Margem</Text>
          <Text style={[styles.cellValue, { color: isPositive ? colors.success : colors.danger }]}>
            {isPositive ? '+' : ''}
            {formatBRL(margin)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    gap: 2,
  },
  cellLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cellValue: {
    ...typography.subheading,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});
