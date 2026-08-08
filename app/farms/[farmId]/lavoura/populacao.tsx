import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../src/components/Card';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { calculatePlantPopulation } from '../../../../src/lib/plantPopulation';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

function parseNumber(value: string): number {
  return Number(value.replace(',', '.')) || 0;
}

function formatNumber(value: number, maxFractionDigits = 0): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: maxFractionDigits });
}

export default function PlantPopulationCalculatorScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [rowSpacing, setRowSpacing] = useState('45');
  const [seedsPerMeter, setSeedsPerMeter] = useState('');
  const [germination, setGermination] = useState('90');
  const [area, setArea] = useState('');

  const result = calculatePlantPopulation({
    rowSpacingCm: parseNumber(rowSpacing),
    seedsPerMeter: parseNumber(seedsPerMeter),
    germinationPct: parseNumber(germination),
    areaHectares: parseNumber(area),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🌱 Calculadora de estande" subtitle="População de plantas e sementes necessárias" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <TextField
            label="Espaçamento entre linhas (cm)"
            value={rowSpacing}
            onChangeText={setRowSpacing}
            placeholder="Ex.: 45"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Sementes por metro linear"
            value={seedsPerMeter}
            onChangeText={setSeedsPerMeter}
            placeholder="Ex.: 12"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Germinação esperada (%)"
            value={germination}
            onChangeText={setGermination}
            placeholder="Ex.: 90"
            keyboardType="decimal-pad"
          />
          <TextField label="Área a plantar (ha)" value={area} onChangeText={setArea} placeholder="Ex.: 50" keyboardType="decimal-pad" />
        </Card>

        {result ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Resultado</Text>
            <ResultRow label="Metros lineares por hectare" value={`${formatNumber(result.linearMetersPerHectare)} m/ha`} colors={colors} styles={styles} />
            <ResultRow
              label="Sementes por hectare (bruto)"
              value={`${formatNumber(result.grossSeedsPerHectare)} sementes/ha`}
              colors={colors}
              styles={styles}
            />
            <ResultRow
              label="População final esperada"
              value={`${formatNumber(result.finalPopulationPerHectare)} plantas/ha`}
              highlight
              colors={colors}
              styles={styles}
            />
            <ResultRow
              label="Sementes totais pra área"
              value={`${formatNumber(result.totalSeedsNeeded)} sementes`}
              colors={colors}
              styles={styles}
            />
          </Card>
        ) : (
          <Text style={styles.hint}>Preencha os campos acima pra ver o resultado.</Text>
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
      <Text style={[styles.resultValue, highlight && { color: colors.lavoura, ...typography.subheading }]}>{value}</Text>
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
    hint: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
