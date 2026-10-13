import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { PlotsMap } from '../../../../../src/components/PlotsMap';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { usePlots } from '../../../../../src/hooks/usePlots';
import { useLatestAguadaEventsByPlot } from '../../../../../src/hooks/usePlotAguadaEvents';
import { useLatestCercaEventsByPlot } from '../../../../../src/hooks/usePlotCercaEvents';
import { useLatestCochoEventsByPlot } from '../../../../../src/hooks/usePlotCochoEvents';
import { useLatestForageEventsByPlot } from '../../../../../src/hooks/usePlotForageEvents';
import { useT } from '../../../../../src/i18n';
import { computeAguadaFarol, type AguadaFarolStatus } from '../../../../../src/lib/aguadaFarol';
import { computeCercaFarol, type CercaFarolStatus } from '../../../../../src/lib/cercaFarol';
import { computeCochoFarol, type CochoStatus } from '../../../../../src/lib/cochoFarol';
import { computeForageFarol, type ForageStatus } from '../../../../../src/lib/forageFarol';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function number(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

type FarolType = 'cocho' | 'aguada' | 'cerca' | 'forage';

const COCHO_COLOR_KEY: Record<CochoStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  em_dia: 'success',
  proximo: 'warning',
  atrasado: 'danger',
  sem_registro: 'textMuted',
};

const AGUADA_COLOR_KEY: Record<AguadaFarolStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  boa: 'success',
  atencao: 'warning',
  ruim: 'danger',
  sem_registro: 'textMuted',
};

const CERCA_COLOR_KEY: Record<CercaFarolStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  boa: 'success',
  atencao: 'warning',
  ruim: 'danger',
  sem_registro: 'textMuted',
};

const FORAGE_COLOR_KEY: Record<ForageStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  em_dia: 'success',
  proximo: 'warning',
  atrasado: 'danger',
  sem_registro: 'textMuted',
};

/** Mapa com o contorno de cada piquete/talhão da pecuária, pintado pelo
 * farol escolhido (Cocho ou Aguada por enquanto, mais tipos entram depois
 * no mesmo padrão) — toca num piquete da lista pra ver o histórico e
 * registrar um novo evento. */
export default function PecuariaMapScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const [farolType, setFarolType] = useState<FarolType>('cocho');
  const { plots, isLoading, reload } = usePlots(farmId, 'pecuaria');
  const mapped = plots.filter((p) => p.boundary && p.boundary.length > 0);
  const plotIds = mapped.map((p) => p.id);
  const { latestByPlotId: cochoByPlotId, isLoading: isLoadingCocho, reload: reloadCocho } = useLatestCochoEventsByPlot(plotIds);
  const { latestByPlotId: aguadaByPlotId, isLoading: isLoadingAguada, reload: reloadAguada } = useLatestAguadaEventsByPlot(plotIds);
  const { latestByPlotId: cercaByPlotId, isLoading: isLoadingCerca, reload: reloadCerca } = useLatestCercaEventsByPlot(plotIds);
  const { latestByPlotId: forageByPlotId, isLoading: isLoadingForage, reload: reloadForage } = useLatestForageEventsByPlot(plotIds);

  useFocusEffect(
    useCallback(() => {
      reload();
      reloadCocho();
      reloadAguada();
      reloadCerca();
      reloadForage();
    }, [reload, reloadCocho, reloadAguada, reloadCerca, reloadForage])
  );

  const totalArea = mapped.reduce((sum, p) => sum + Number(p.area_hectares), 0);

  const plotsWithColorKey = mapped.map((plot) => {
    const colorKey =
      farolType === 'cocho'
        ? COCHO_COLOR_KEY[computeCochoFarol(cochoByPlotId[plot.id]?.refilled_at ?? null, plot.cocho_interval_days).status]
        : farolType === 'aguada'
          ? AGUADA_COLOR_KEY[computeAguadaFarol(aguadaByPlotId[plot.id]?.status ?? null)]
          : farolType === 'cerca'
            ? CERCA_COLOR_KEY[computeCercaFarol(cercaByPlotId[plot.id]?.status ?? null)]
            : FORAGE_COLOR_KEY[computeForageFarol(forageByPlotId[plot.id]?.height_cm ?? null, plot.forage_min_height_cm).status];
    return { plot, colorKey };
  });

  const statusLabels =
    farolType === 'cocho'
      ? [
          { key: 'success' as const, label: t('cochoFarol.statusEmDia') },
          { key: 'warning' as const, label: t('cochoFarol.statusProximo') },
          { key: 'danger' as const, label: t('cochoFarol.statusAtrasado') },
          { key: 'textMuted' as const, label: t('cochoFarol.statusSemRegistro') },
        ]
      : farolType === 'aguada'
        ? [
            { key: 'success' as const, label: t('aguadaFarol.statusBoa') },
            { key: 'warning' as const, label: t('aguadaFarol.statusAtencao') },
            { key: 'danger' as const, label: t('aguadaFarol.statusRuim') },
            { key: 'textMuted' as const, label: t('aguadaFarol.statusSemRegistro') },
          ]
        : farolType === 'cerca'
          ? [
              { key: 'success' as const, label: t('cercaFarol.statusBoa') },
              { key: 'warning' as const, label: t('cercaFarol.statusAtencao') },
              { key: 'danger' as const, label: t('cercaFarol.statusRuim') },
              { key: 'textMuted' as const, label: t('cercaFarol.statusSemRegistro') },
            ]
          : [
              { key: 'success' as const, label: t('forageFarol.statusEmDia') },
              { key: 'warning' as const, label: t('forageFarol.statusProximo') },
              { key: 'danger' as const, label: t('forageFarol.statusAtrasado') },
              { key: 'textMuted' as const, label: t('forageFarol.statusSemRegistro') },
            ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('plotsMap.title')}
        subtitle={t('plotsMap.subtitle', { count: mapped.length, area: number(totalArea, 1) })}
      />
      <View style={styles.selectorWrap}>
        <ChipSelect
          label={t('plotsMap.farolTypeLabel')}
          options={[
            { value: 'cocho', label: t('plotsMap.farolTypeCocho') },
            { value: 'aguada', label: t('plotsMap.farolTypeAguada') },
            { value: 'cerca', label: t('plotsMap.farolTypeCerca') },
            { value: 'forage', label: t('plotsMap.farolTypeForage') },
          ]}
          value={farolType}
          onChange={setFarolType}
          accentColor={colors.pecuaria}
        />
      </View>
      {isLoading || isLoadingCocho || isLoadingAguada || isLoadingCerca || isLoadingForage ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : mapped.length === 0 ? (
        <EmptyState text={t('plotsMap.empty')} />
      ) : (
        <>
          <View style={styles.mapWrap}>
            <PlotsMap
              plots={plotsWithColorKey.map(({ plot, colorKey }) => ({
                id: plot.id,
                name: plot.name,
                areaHectares: Number(plot.area_hectares),
                boundary: plot.boundary ?? [],
                color: colors[colorKey],
              }))}
              height={320}
            />
          </View>

          <View style={styles.legendRow}>
            {statusLabels.map(({ key, label }) => (
              <LegendItem key={key} color={colors[key]} label={label} styles={styles} />
            ))}
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {plotsWithColorKey
              .slice()
              .sort((a, b) => a.plot.name.localeCompare(b.plot.name, 'pt-BR', { numeric: true }))
              .map(({ plot, colorKey }) => (
                <Pressable
                  key={plot.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/farms/${farmId}/pecuaria/mapa/${plot.id}`)}
                >
                  <View style={[styles.rowDot, { backgroundColor: colors[colorKey] }]} />
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
    selectorWrap: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
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
