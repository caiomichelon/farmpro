import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../src/components/Card';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { calculateSprayMix } from '../../../../src/lib/sprayMix';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

function parseNumber(value: string): number {
  return Number(value.replace(',', '.')) || 0;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export default function SprayMixCalculatorScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [area, setArea] = useState('');
  const [dose, setDose] = useState('');
  const [sprayVolume, setSprayVolume] = useState('200');
  const [tankCapacity, setTankCapacity] = useState('2000');

  const result = calculateSprayMix({
    areaHectares: parseNumber(area),
    doseProductPerHa: parseNumber(dose),
    sprayVolumePerHaLiters: parseNumber(sprayVolume),
    tankCapacityLiters: parseNumber(tankCapacity),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🧪 Calculadora de calda" subtitle="Mistura de defensivo — quanto colocar em cada tanque" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <TextField label="Área a pulverizar (ha)" value={area} onChangeText={setArea} placeholder="Ex.: 50" keyboardType="decimal-pad" />
          <TextField
            label="Dose do produto (por ha — L ou kg)"
            value={dose}
            onChangeText={setDose}
            placeholder="Ex.: 1.5"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Volume de calda por hectare (L/ha)"
            value={sprayVolume}
            onChangeText={setSprayVolume}
            placeholder="Ex.: 200"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Capacidade do tanque (L)"
            value={tankCapacity}
            onChangeText={setTankCapacity}
            placeholder="Ex.: 2000"
            keyboardType="decimal-pad"
          />
        </Card>

        {result ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Resultado</Text>
            <ResultRow label="Produto total necessário" value={`${formatNumber(result.totalProductNeeded)} L/kg`} colors={colors} styles={styles} />
            <ResultRow label="Volume total de calda" value={`${formatNumber(result.totalSprayVolumeLiters)} L`} colors={colors} styles={styles} />
            <View style={styles.divider} />
            <ResultRow
              label={`Produto por tanque cheio (${formatNumber(Number(tankCapacity.replace(',', '.')) || 0)} L)`}
              value={`${formatNumber(result.productPerFullTank)} L/kg`}
              highlight
              colors={colors}
              styles={styles}
            />
            <Text style={styles.hint}>Complete o resto do tanque com água.</Text>
            {result.fullTanks > 0 ? (
              <ResultRow label="Tanques cheios necessários" value={`${result.fullTanks}`} colors={colors} styles={styles} />
            ) : null}
            {result.lastTankVolumeLiters > 0.01 ? (
              <>
                <ResultRow
                  label={`Último tanque (${formatNumber(result.lastTankVolumeLiters)} L de calda)`}
                  value={`${formatNumber(result.productForLastTank)} L/kg de produto`}
                  colors={colors}
                  styles={styles}
                />
              </>
            ) : null}
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
