import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { SimpleChart, type ChartType } from '../../../src/components/SimpleChart';
import { useCostBreakdown } from '../../../src/hooks/useCostBreakdown';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

const SECTOR_ACCENT: Record<string, keyof ReturnType<typeof useColors>> = {
  Lavoura: 'lavoura',
  Corte: 'pecuaria',
  Cria: 'pecuaria',
  Funcionários: 'funcionarios',
};

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MoneyBreakdownScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { items, total, isLoading, error } = useCostBreakdown(farmId);
  const [chartType, setChartType] = useState<ChartType>('pizza');

  const chartData = items.map((i) => ({ label: `${i.sectorLabel} — ${i.category}`, value: i.value }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Pra onde vai o dinheiro"
        subtitle={total > 0 ? `${currency(total)} lançados no total` : 'Custos já lançados na fazenda'}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState text="Nenhum custo lançado ainda em Lavoura, Corte, Cria ou Funcionários." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <FadeSlideIn delay={40}>
            <Card style={styles.chartCard}>
              <View style={styles.chartTypeRow}>
                {(['pizza', 'barras'] as ChartType[]).map((type) => (
                  <Text
                    key={type}
                    style={[styles.chartTypeOption, chartType === type && styles.chartTypeOptionActive]}
                    onPress={() => setChartType(type)}
                  >
                    {type === 'pizza' ? 'Pizza' : 'Barras'}
                  </Text>
                ))}
              </View>
              <SimpleChart type={chartType} data={chartData} color={colors.primary} />
            </Card>
          </FadeSlideIn>

          <FadeSlideIn delay={90}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Maiores gastos</Text>
              {items.map((item, index) => {
                const accentKey = SECTOR_ACCENT[item.sectorLabel] ?? 'primary';
                const accentColor = colors[accentKey];
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <Card key={`${item.sector}-${item.category}-${index}`} style={styles.itemCard}>
                    <View style={styles.itemTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemCategory}>{item.category}</Text>
                        <Text style={[styles.itemSector, { color: accentColor }]}>{item.sectorLabel}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.itemValue}>{currency(item.value)}</Text>
                        <Text style={styles.itemPct}>{pct.toFixed(0)}%</Text>
                      </View>
                    </View>
                    <View style={styles.itemBarTrack}>
                      <View style={[styles.itemBarFill, { width: `${pct}%`, backgroundColor: accentColor }]} />
                    </View>
                  </Card>
                );
              })}
            </View>
          </FadeSlideIn>

          <FadeSlideIn delay={140}>
            <Text style={styles.footnote}>
              Soma dos custos já lançados nas telas de Custo de produção (Lavoura), Custos do lote (Corte), Custos da
              matriz (Cria) e o valor cadastrado dos funcionários ativos (mensalista, diarista e por tarefa, cada um no
              valor cadastrado — sem converter pra um período comum).
            </Text>
          </FadeSlideIn>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    chartCard: {
      gap: spacing.md,
      alignItems: 'center',
    },
    chartTypeRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignSelf: 'flex-start',
    },
    chartTypeOption: {
      ...typography.captionMedium,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
    },
    chartTypeOptionActive: {
      color: colors.textInverse,
      backgroundColor: colors.primary,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    itemCard: {
      gap: spacing.sm,
    },
    itemTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    itemCategory: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    itemSector: {
      ...typography.caption,
      marginTop: 2,
    },
    itemValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    itemPct: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    itemBarTrack: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    itemBarFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
