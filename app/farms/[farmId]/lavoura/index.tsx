import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../src/components/FadeSlideIn';
import { FinancialSummary } from '../../../../src/components/FinancialSummary';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { StatGrid } from '../../../../src/components/StatGrid';
import { useLavouraSummary } from '../../../../src/hooks/useLavouraSummary';
import { usePlotsWithLatestSeason, type PlotWithLatestSeason } from '../../../../src/hooks/usePlots';
import { useT } from '../../../../src/i18n';
import { colors, radius, spacing, typography } from '../../../../src/theme';

export default function LavouraHomeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { plots, activeSeason, isLoading, error, reload } = usePlotsWithLatestSeason(farmId);
  const { summary, reload: reloadSummary } = useLavouraSummary(farmId);
  const t = useT();

  function handleHarvestPress() {
    if (activeSeason) {
      router.push(`/farms/${farmId}/lavoura/safra/${activeSeason.seasonId}/colheita`);
    } else if (plots.length > 0) {
      // Já tem talhão, mas nenhum tem safra lançada — o passo que falta é
      // cadastrar a safra, não abrir a lista de novo.
      router.push(`/farms/${farmId}/lavoura/talhao/${plots[0].id}/nova-safra`);
    } else {
      // Sem nenhum talhão ainda — pula direto pro atalho que pede só
      // cultura e área, sem introduzir o conceito de talhão pra quem só
      // quer lançar colheita.
      router.push(`/farms/${farmId}/lavoura/colheita-inicio`);
    }
  }

  const harvestCtaSubtitle = activeSeason
    ? t('lavouraHome.harvestCtaSubtitleActive', {
        crop: activeSeason.crop,
        plot: activeSeason.plotName,
        season: activeSeason.seasonLabel,
      })
    : plots.length > 0
      ? t('lavouraHome.harvestCtaSubtitleNeedsSeason', { plot: plots[0].name })
      : t('lavouraHome.harvestCtaSubtitleNeedsPlot');

  // A tela de "novo talhão" é uma rota separada — ao voltar pra cá o hook
  // desta tela não recarrega sozinho (ela já estava montada, nada mudou nas
  // deps do fetch original). Refazemos a busca sempre que a tela ganha foco
  // de novo, senão o talhão recém-criado só aparece depois de um refresh manual.
  useFocusEffect(
    useCallback(() => {
      reload();
      reloadSummary();
    }, [reload, reloadSummary])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('lavouraHome.title')}
        subtitle={`${summary.totalPlots} ${summary.totalPlots === 1 ? t('lavouraHome.subtitlePlotSingular') : t('lavouraHome.subtitlePlotPlural')} · ${summary.totalHectares.toLocaleString('pt-BR')} ha`}
        right={
          <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/compradores`)} hitSlop={12}>
            <Text style={styles.headerLink}>{t('lavouraHome.buyers')}</Text>
          </Pressable>
        }
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : (
        <FlatList
          data={plots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <FadeSlideIn>
              <View style={styles.headerContent}>
                <Pressable
                  style={({ pressed }) => [styles.harvestCta, pressed && styles.harvestCtaPressed]}
                  onPress={handleHarvestPress}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.harvestCtaTitle}>{t('lavouraHome.harvestCtaTitle')}</Text>
                    <Text style={styles.harvestCtaSubtitle}>{harvestCtaSubtitle}</Text>
                  </View>
                  <Text style={styles.harvestCtaChevron}>→</Text>
                </Pressable>

                <StatGrid
                  stats={[
                    { label: t('lavouraHome.statPlots'), value: String(summary.totalPlots) },
                    { label: t('lavouraHome.statArea'), value: `${summary.totalHectares.toLocaleString('pt-BR')} ha` },
                    { label: t('lavouraHome.statActiveSeasons'), value: String(summary.activeSeasons) },
                    {
                      label: t('lavouraHome.statYield'),
                      value: summary.avgYieldPerHectare !== null ? `${summary.avgYieldPerHectare.toFixed(1)} sc/ha` : '—',
                    },
                  ]}
                />
                <FinancialSummary cost={summary.totalCost} revenue={summary.totalRevenue} margin={summary.margin} />
                <View style={styles.linksRow}>
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/planilha`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkPlotSheet')}</Text>
                  </Pressable>
                  <Text style={styles.linkDivider}>·</Text>
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/safras`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkSeasonSheet')}</Text>
                  </Pressable>
                  <Text style={styles.linkDivider}>·</Text>
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/estoque`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkStock')}</Text>
                  </Pressable>
                  <Text style={styles.linkDivider}>·</Text>
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/comparativo-regional`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkRegionalComparison')}</Text>
                  </Pressable>
                  <Text style={styles.linkDivider}>·</Text>
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/calda`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkSprayCalculator')}</Text>
                  </Pressable>
                  <Text style={styles.linkDivider}>·</Text>
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/populacao`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkPopulationCalculator')}</Text>
                  </Pressable>
                  <Text style={styles.linkDivider}>·</Text>
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/adubacao`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkFertilizerCalculator')}</Text>
                  </Pressable>
                </View>
              </View>
            </FadeSlideIn>
          }
          ListEmptyComponent={<EmptyState text={t('lavouraHome.empty')} />}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={Math.min(index, 6) * 50}>
              <PlotCard
                plot={item}
                onPress={() => router.push(`/farms/${farmId}/lavoura/talhao/${item.id}`)}
                noSeasonLabel={t('lavouraHome.noSeason')}
              />
            </FadeSlideIn>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button label={t('lavouraHome.newPlot')} onPress={() => router.push(`/farms/${farmId}/lavoura/novo-talhao`)} />
      </View>
    </SafeAreaView>
  );
}

function PlotCard({ plot, onPress, noSeasonLabel }: { plot: PlotWithLatestSeason; onPress: () => void; noSeasonLabel: string }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{plot.name}</Text>
        <Text style={styles.cardArea}>{Number(plot.area_hectares).toLocaleString('pt-BR')} ha</Text>
      </View>
      {plot.latestCrop ? (
        <View style={styles.cropBadge}>
          <Text style={styles.cropBadgeText}>
            {plot.latestCrop}
            {plot.latestSeasonLabel ? ` · ${plot.latestSeasonLabel}` : ''}
          </Text>
        </View>
      ) : (
        <Text style={styles.noCropText}>{noSeasonLabel}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerLink: {
    ...typography.captionMedium,
    color: colors.lavoura,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  harvestCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.lavoura,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  harvestCtaPressed: {
    opacity: 0.85,
  },
  harvestCtaTitle: {
    ...typography.subheading,
    color: colors.textInverse,
  },
  harvestCtaSubtitle: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.85,
    marginTop: 2,
  },
  harvestCtaChevron: {
    ...typography.heading,
    color: colors.textInverse,
  },
  headerContent: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  link: {
    ...typography.captionMedium,
    color: colors.lavoura,
  },
  linkDivider: {
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  cardArea: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  cropBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lavouraLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  cropBadgeText: {
    ...typography.captionMedium,
    color: colors.lavoura,
  },
  noCropText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
