import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../src/components/Card';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { useT } from '../../../../src/i18n';
import { calculateFertilizer } from '../../../../src/lib/fertilizerCalc';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export default function FertilizerCalculatorScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  const [area, setArea] = useState('');
  const [dose, setDose] = useState('');
  const [price, setPrice] = useState('');
  const [nPct, setNPct] = useState('');
  const [p2o5Pct, setP2o5Pct] = useState('');
  const [k2oPct, setK2oPct] = useState('');

  const result = calculateFertilizer({
    areaHectares: parseNumber(area) ?? 0,
    doseKgPerHa: parseNumber(dose) ?? 0,
    pricePerKg: parseNumber(price),
    nPct: parseNumber(nPct),
    p2o5Pct: parseNumber(p2o5Pct),
    k2oPct: parseNumber(k2oPct),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('fertilizerCalc.title')} subtitle={t('fertilizerCalc.subtitle')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <TextField label={t('fertilizerCalc.area')} value={area} onChangeText={setArea} placeholder={t('fertilizerCalc.areaPlaceholder')} keyboardType="decimal-pad" />
          <TextField label={t('fertilizerCalc.dose')} value={dose} onChangeText={setDose} placeholder={t('fertilizerCalc.dosePlaceholder')} keyboardType="decimal-pad" />
          <TextField label={t('fertilizerCalc.price')} value={price} onChangeText={setPrice} placeholder={t('fertilizerCalc.pricePlaceholder')} keyboardType="decimal-pad" />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('fertilizerCalc.formulationTitle')}</Text>
          <Text style={styles.hint}>{t('fertilizerCalc.formulationHelp')}</Text>
          <View style={styles.formulationRow}>
            <View style={styles.formulationField}>
              <TextField label={t('fertilizerCalc.nPct')} value={nPct} onChangeText={setNPct} placeholder="04" keyboardType="decimal-pad" />
            </View>
            <View style={styles.formulationField}>
              <TextField label={t('fertilizerCalc.p2o5Pct')} value={p2o5Pct} onChangeText={setP2o5Pct} placeholder="14" keyboardType="decimal-pad" />
            </View>
            <View style={styles.formulationField}>
              <TextField label={t('fertilizerCalc.k2oPct')} value={k2oPct} onChangeText={setK2oPct} placeholder="08" keyboardType="decimal-pad" />
            </View>
          </View>
        </Card>

        {result ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>{t('fertilizerCalc.resultTitle')}</Text>
            <ResultRow label={t('fertilizerCalc.totalKg')} value={`${formatNumber(result.totalKg)} kg`} highlight colors={colors} styles={styles} />
            {result.totalCost !== null ? (
              <ResultRow
                label={t('fertilizerCalc.totalCost')}
                value={result.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                colors={colors}
                styles={styles}
              />
            ) : null}
            {result.totalNKg !== null || result.totalP2O5Kg !== null || result.totalK2OKg !== null ? (
              <>
                <View style={styles.divider} />
                {result.totalNKg !== null ? (
                  <ResultRow label={t('fertilizerCalc.totalN')} value={`${formatNumber(result.totalNKg)} kg`} colors={colors} styles={styles} />
                ) : null}
                {result.totalP2O5Kg !== null ? (
                  <ResultRow label={t('fertilizerCalc.totalP2O5')} value={`${formatNumber(result.totalP2O5Kg)} kg`} colors={colors} styles={styles} />
                ) : null}
                {result.totalK2OKg !== null ? (
                  <ResultRow label={t('fertilizerCalc.totalK2O')} value={`${formatNumber(result.totalK2OKg)} kg`} colors={colors} styles={styles} />
                ) : null}
              </>
            ) : null}
          </Card>
        ) : (
          <Text style={styles.hint}>{t('fertilizerCalc.hint')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultRow({
  label,
  value,
  highlight,
  colors,
  styles,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, highlight && { color: colors.lavoura, fontSize: 20 }]}>{value}</Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    card: {
      gap: spacing.md,
      borderRadius: radius.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    formulationRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    formulationField: {
      flex: 1,
    },
    resultRow: {
      gap: 2,
    },
    resultLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    resultValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
