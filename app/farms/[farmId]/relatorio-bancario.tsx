import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { EMPLOYEE_SECTOR_LABELS, EMPLOYEE_SECTOR_OPTIONS } from '../../../src/data/employeeOptions';
import { useBreedingCows } from '../../../src/hooks/useBreedingCows';
import { useCattleLots } from '../../../src/hooks/useCattleLots';
import { useEmployees } from '../../../src/hooks/useEmployees';
import { useFarm } from '../../../src/hooks/useFarms';
import { useGrainRevenue } from '../../../src/hooks/useGrainRevenue';
import { useSeasonsByFarm } from '../../../src/hooks/usePlotSeasons';
import { buildBankReportHtml, generateBankReportPdf } from '../../../src/lib/bankReport';
import type { EmployeeSector } from '../../../src/types/database';
import { spacing, typography, useColors, type Colors } from '../../../src/theme';

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function BankReportScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm } = useFarm(farmId);
  const { lots, isLoading: lotsLoading } = useCattleLots(farmId);
  const { cows, isLoading: cowsLoading } = useBreedingCows(farmId);
  const { seasons, isLoading: seasonsLoading } = useSeasonsByFarm(farmId);
  const { employees, isLoading: employeesLoading } = useEmployees(farmId);
  const { revenue: grainRevenue, isLoading: revenueLoading } = useGrainRevenue(farmId);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isLoading = lotsLoading || cowsLoading || seasonsLoading || employeesLoading || revenueLoading || !farm;

  const activeLots = lots.filter((l) => l.status === 'ativo');
  const lotsWithGmd = activeLots.filter((l) => l.gmdKgPerDay !== null);
  const avgGmd = lotsWithGmd.length > 0 ? lotsWithGmd.reduce((sum, l) => sum + (l.gmdKgPerDay ?? 0), 0) / lotsWithGmd.length : null;

  const countBySector: { label: string; count: number }[] = EMPLOYEE_SECTOR_OPTIONS.map((sector: EmployeeSector) => ({
    label: EMPLOYEE_SECTOR_LABELS[sector],
    count: employees.filter((e) => e.sector === sector).length,
  })).filter((s) => s.count > 0);

  const summary = {
    lavoura: {
      totalHectares: farm?.lavouraHectares ?? 0,
      activeSeasonCount: seasons.filter((s) => s.status === 'plantada' || s.status === 'colhendo').length,
      totalPlantedHectares: seasons.reduce((sum, s) => sum + Number(s.planted_area_hectares), 0),
      totalHarvestedSacas: seasons.reduce((sum, s) => sum + s.totalHarvestedSacas, 0),
      totalCost: seasons.reduce((sum, s) => sum + s.totalCost, 0),
      totalRevenue: grainRevenue,
    },
    corte: {
      activeLotCount: activeLots.length,
      totalHeadCount: activeLots.reduce((sum, l) => sum + l.currentHeadCount, 0),
      avgGmdKgPerDay: avgGmd,
      totalCost: activeLots.reduce((sum, l) => sum + l.totalCost, 0),
      projectedRevenue: activeLots.reduce((sum, l) => sum + l.projectedRevenue, 0),
      projectedMargin: activeLots.reduce((sum, l) => sum + l.projectedMargin, 0),
    },
    cria: {
      totalCows: cows.length,
      pregnantCount: cows.filter((c) => c.isPregnant).length,
      totalCalvesBorn: cows.reduce((sum, c) => sum + c.calfCount, 0),
      totalCost: cows.reduce((sum, c) => sum + c.totalCost, 0),
    },
    funcionarios: {
      totalCount: employees.length,
      countBySector,
      totalMonthlyCost: employees.reduce((sum, e) => sum + Number(e.cost_value), 0),
    },
  };

  const consolidatedResult =
    summary.lavoura.totalRevenue +
    summary.corte.projectedRevenue -
    (summary.lavoura.totalCost + summary.corte.totalCost + summary.cria.totalCost);

  async function handleGenerate() {
    if (!farm) return;
    setIsGenerating(true);
    setError(null);
    setDone(false);
    try {
      const html = buildBankReportHtml({
        farmName: farm.name,
        city: farm.city,
        state: farm.state,
        generatedAt: new Date(),
        ...summary,
      });
      await generateBankReportPdf(html);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o relatório.');
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Relatório para banco" subtitle="Resumo pra apresentar em financiamento (Plano Safra, Pronaf etc.)" />

      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Visão geral</Text>
          <View style={styles.grid}>
            <Stat label="Área total (Lavoura)" value={`${summary.lavoura.totalHectares.toLocaleString('pt-BR')} ha`} colors={colors} />
            <Stat label="Cabeças de corte" value={String(summary.corte.totalHeadCount)} colors={colors} />
            <Stat label="Matrizes de cria" value={String(summary.cria.totalCows)} colors={colors} />
            <Stat label="Funcionários" value={String(summary.funcionarios.totalCount)} colors={colors} />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Resultado consolidado</Text>
          <Text style={[styles.resultValue, { color: consolidatedResult >= 0 ? colors.success : colors.danger }]}>
            {currency(consolidatedResult)}
          </Text>
          <Text style={styles.resultHint}>Lavoura + Corte (projetado) − custos lançados na Lavoura, Corte e Cria.</Text>
        </Card>

        {done ? (
          <Card style={styles.successCard}>
            <Text style={styles.cardTitle}>Relatório gerado</Text>
            <Text style={styles.infoText}>
              O PDF foi aberto pra compartilhar ou salvar. Gere de novo a qualquer momento — os dados são sempre os
              mais recentes.
            </Text>
          </Card>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Gerar relatório em PDF" onPress={handleGenerate} loading={isGenerating} />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  return (
    <View style={statStyles.wrap}>
      <Text style={[statStyles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  wrap: { flexBasis: '47%' },
  value: { ...typography.heading },
  label: { ...typography.caption, marginTop: 2 },
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
      gap: spacing.lg,
    },
    card: {
      gap: spacing.sm,
    },
    successCard: {
      gap: spacing.xs,
      borderColor: colors.successLight,
      backgroundColor: colors.successLight,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    resultValue: {
      ...typography.displayMd,
    },
    resultHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    infoText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
