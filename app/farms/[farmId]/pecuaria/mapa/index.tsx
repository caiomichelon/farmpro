import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../../../../../src/components/EmptyState';
import { PlotsMap } from '../../../../../src/components/PlotsMap';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { usePlots } from '../../../../../src/hooks/usePlots';
import { useLatestCochoEventsByPlot } from '../../../../../src/hooks/usePlotCochoEvents';
import { useT } from '../../../../../src/i18n';
import { computeCochoFarol, type CochoStatus } from '../../../../../src/lib/cochoFarol';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function number(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const STATUS_COLOR_KEY: Record<CochoStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  em_dia: 'success',
  proximo: 'warning',
  atrasado: 'danger',
  sem_registro: 'textMuted',
};

/** Mapa com o contorno de cada piquete/talhão da pecuária, pintado pelo
 * farol do cocho (verde = em dia, amarelo = precisa abastecer logo,
 * vermelho = atrasado, cinza = nunca abastecido) — toca num piquete da
 * lista pra ver o histórico e registrar um novo abastecimento. */
export default function PecuariaMapScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { plots, isLoading, reload } = usePlots(farmId, 'pecuaria');
  const mapped = plots.filter((p) => p.boundary && p.boundary.length > 0);
  const { latestByPlotId, isLoading: isLoadingEvents, reload: reloadEvents } = useLatestCochoEventsByPlot(mapped.map((p) => p.id));

  useFocusEffect(
    useCallback(() => {
      reload();
      reloadEvents();
    }, [reload, reloadEvents])
  );

  const totalArea = mapped.reduce((sum, p) => sum + Number(p.area_hectares), 0);

  const plotsWithFarol = mapped.map((p) => {
    const farol = computeCochoFarol(latestByPlotId[p.id]?.refilled_at ?? null, p.cocho_interval_days);
    return { plot: p, farol };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('plotsMap.title')}
        subtitle={t('plotsMap.subtitle', { count: mapped.length, area: number(totalArea, 1) })}
      />
      {isLoading || isLoadingEvents ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : mapped.length === 0 ? (
        <EmptyState text={t('plotsMap.empty')} />
      ) : (
        <>
          <View style={styles.mapWrap}>
            <PlotsMap
              plots={plotsWithFarol.map(({ plot, farol }) => ({
                id: plot.id,
                name: plot.name,
                areaHectares: Number(plot.area_hectares),
                boundary: plot.boundary ?? [],
                color: colors[STATUS_COLOR_KEY[farol.status]],
              }))}
              height={320}
            />
          </View>

          <View style={styles.legendRow}>
            <LegendItem color={colors.success} label={t('cochoFarol.statusEmDia')} styles={styles} />
            <LegendItem color={colors.warning} label={t('cochoFarol.statusProximo')} styles={styles} />
            <LegendItem color={colors.danger} label={t('cochoFarol.statusAtrasado')} styles={styles} />
            <LegendItem color={colors.textMuted} label={t('cochoFarol.statusSemRegistro')} styles={styles} />
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {plotsWithFarol
              .slice()
              .sort((a, b) => a.plot.name.localeCompare(b.plot.name, 'pt-BR', { numeric: true }))
              .map(({ plot, farol }) => (
                <Pressable
                  key={plot.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/farms/${farmId}/pecuaria/mapa/${plot.id}`)}
                >
                  <View style={[styles.rowDot, { backgroundColor: colors[STATUS_COLOR_KEY[farol.status]] }]} />
                  <Text style={styles.rowName}>{plot.name}</Text>
                  <Text style={styles.rowArea}>{number(Number(plot.area_hectares), 1)} ha</Text>
                </Pressable>
              ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function LegendItem({ color, label, styles }: { color: string; label: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    mapWrap: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: radius.full,
    },
    legendLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    rowPressed: {
      opacity: 0.8,
    },
    rowDot: {
      width: 10,
      height: 10,
      borderRadius: radius.full,
    },
    rowName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      flex: 1,
    },
    rowArea: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
