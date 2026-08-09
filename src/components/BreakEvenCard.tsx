import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import { calculateBreakEven } from '../lib/breakEven';
import { radius, spacing, typography, useColors, type Colors } from '../theme';
import { TextField } from './TextField';

interface BreakEvenCardProps {
  totalCost: number;
  quantity: number;
  unitLabel: string;
  targetMarginPct: string;
  onChangeTargetMarginPct: (value: string) => void;
}

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Preço mínimo (break-even) e preço pra bater uma margem alvo — usado no
 * lote (Corte, por @), na safra (Lavoura, por saca) e na matriz (Cria, por
 * bezerro desmamado). Sempre calculado a partir do custo já lançado, nunca
 * de preço de mercado inventado. */
export function BreakEvenCard({
  totalCost,
  quantity,
  unitLabel,
  targetMarginPct,
  onChangeTargetMarginPct,
}: BreakEvenCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  const marginPct = Number(targetMarginPct.replace(',', '.')) || 0;
  const result = calculateBreakEven({ totalCost, quantity, targetMarginPct: marginPct });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('breakEven.title')}</Text>
      {result ? (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>{t('breakEven.breakEvenLabel')}</Text>
            <Text style={styles.value}>
              {currency(result.breakEvenPrice)}/{unitLabel}
            </Text>
          </View>
          <View style={styles.marginRow}>
            <View style={styles.marginInput}>
              <TextField
                label={t('breakEven.targetMarginLabel')}
                value={targetMarginPct}
                onChangeText={onChangeTargetMarginPct}
                keyboardType="decimal-pad"
                placeholder="Ex.: 20"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('breakEven.targetPriceLabel')}</Text>
              <Text style={[styles.value, styles.highlight]}>
                {currency(result.targetPrice)}/{unitLabel}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.hint}>{t('breakEven.hint')}</Text>
      )}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    title: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    row: {
      gap: 2,
    },
    label: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    value: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    highlight: {
      color: colors.primary,
      ...typography.subheading,
    },
    marginRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.md,
    },
    marginInput: {
      width: 110,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
