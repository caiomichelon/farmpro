import Slider from '@react-native-community/slider';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../../../../src/components/Card';
import { FinancialSummary } from '../../../../../../../src/components/FinancialSummary';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { getCommodityQuotes } from '../../../../../../../src/data/commodities';
import { useCattleLot } from '../../../../../../../src/hooks/useCattleLots';
import { spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const KG_PER_ARROBA = 15;

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function LotSimulatorScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { lot, isLoading } = useCattleLot(lotId);

  const [basePrice, setBasePrice] = useState(300);
  const [arrobaPrice, setArrobaPrice] = useState(300);
  const [targetWeightKg, setTargetWeightKg] = useState(0);
  const [extraCostPerHead, setExtraCostPerHead] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getCommodityQuotes().then((quotes) => {
      const price = quotes.find((q) => q.id === 'boi-gordo')?.price ?? 300;
      setBasePrice(price);
      setArrobaPrice((current) => (initialized ? current : price));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lot && !initialized) {
      setTargetWeightKg(Math.round(lot.latestWeightKg));
      setInitialized(true);
    }
  }, [lot, initialized]);

  if (isLoading || !lot || !initialized) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  const carcassYieldPct = Number(lot.estimated_carcass_yield_pct);
  const estimatedArrobas = (targetWeightKg * lot.currentHeadCount * (carcassYieldPct / 100)) / KG_PER_ARROBA;
  const simulatedRevenue = estimatedArrobas * arrobaPrice;
  const simulatedCost = lot.totalCost + extraCostPerHead * lot.currentHeadCount;
  const simulatedMargin = simulatedRevenue - simulatedCost;

  function handleReset() {
    setArrobaPrice(basePrice);
    setTargetWeightKg(Math.round(lot!.latestWeightKg));
    setExtraCostPerHead(0);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Simular cenários" subtitle={`Lote ${lot.name} — e se...`} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <SliderRow
            label="Preço da arroba"
            value={arrobaPrice}
            displayValue={currency(arrobaPrice)}
            min={Math.max(50, basePrice * 0.6)}
            max={basePrice * 1.4}
            step={1}
            onChange={setArrobaPrice}
            colors={colors}
          />
          <SliderRow
            label="Peso de abate"
            value={targetWeightKg}
            displayValue={`${targetWeightKg} kg`}
            min={Math.max(50, Math.round(lot.latestWeightKg * 0.8))}
            max={Math.round(lot.latestWeightKg * 1.6)}
            step={1}
            onChange={setTargetWeightKg}
            colors={colors}
          />
          <SliderRow
            label="Custo extra por cabeça"
            value={extraCostPerHead}
            displayValue={currency(extraCostPerHead)}
            min={0}
            max={500}
            step={5}
            onChange={setExtraCostPerHead}
            colors={colors}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Resultado simulado</Text>
          <FinancialSummary cost={simulatedCost} revenue={simulatedRevenue} margin={simulatedMargin} />
          <Text style={styles.hint}>
            {estimatedArrobas.toFixed(1)} @ estimadas ({lot.currentHeadCount} cabeças × {targetWeightKg} kg ×{' '}
            {carcassYieldPct.toFixed(0)}% de rendimento ÷ 15 kg).
          </Text>
        </Card>

        <Text style={styles.resetLink} onPress={handleReset}>
          ↺ Voltar pros valores atuais
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SliderRow({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  colors: Colors;
}) {
  return (
    <View style={sliderRowStyles.wrap}>
      <View style={sliderRowStyles.headerRow}>
        <Text style={[sliderRowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[sliderRowStyles.value, { color: colors.textPrimary }]}>{displayValue}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.pecuaria}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.pecuaria}
      />
    </View>
  );
}

const sliderRowStyles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.captionMedium,
  },
  value: {
    ...typography.bodyMedium,
  },
});

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.lg,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    resetLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  });
}
