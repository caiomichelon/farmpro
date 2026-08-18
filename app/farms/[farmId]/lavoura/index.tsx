import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
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
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

export default function LavouraHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { plots, activeSeason, isLoading, error, reload } = usePlotsWithLatestSeason(farmId);
  const { summary, reload: reloadSummary } = useLavouraSummary(farmId);
  const t = useT();

  function handleHarvestPress() {
    if (activeSeason) {
      router.push(`/farms/${farmId}/lavoura/safra/${activeSeason.seasonId}/colheita`);
    } else {
      // Sem safra ativa (com ou sem talhão cadastrado) — vai direto pra
      // colheita solta na fazenda, sem pedir nada antes.
      router.push(`/farms/${farmId}/lavoura/colheita`);
    }
  }

  const harvestCtaSubtitle = activeSeason
    ? t('lavouraHome.harvestCtaSubtitleActive', {
        crop: activeSeason.crop,
        plot: activeSeason.plotName,
        season: activeSeason.seasonLabel,
      })
    : t('lavouraHome.harvestCtaSubtitleGeneric');

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
                  <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/benchmarking`)} hitSlop={8}>
                    <Text style={styles.link}>{t('lavouraHome.linkBenchmarking')}</Text>
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

                {/* Itens que não são exclusivos de nenhum setor (clima,
                    funcionários, etc.) — moram aqui e em Pecuária, não na
                    home da fazenda, que fica só com os dois setores. */}
                <View style={styles.moreSection}>
                  <MoreRow
                    icon="👨‍🌾"
                    title={t('farmHome.employees')}
                    subtitle={t('farmHome.employeesSubtitle')}
                    onPress={() => router.push(`/farms/${farmId}/funcionarios`)}
                    styles={styles}
                  />
                  <MoreRow
                    icon="👷"
                    title="Diaristas"
                    subtitle="Mão de obra avulsa, sem cadastro fixo"
                    onPress={() => router.push(`/farms/${farmId}/diaristas`)}
                    styles={styles}
                  />
                  <MoreRow
                    icon="🔧"
                    title="Maquinário"
                    subtitle="Tratores e implementos — manutenção em dia"
                    onPress={() => router.push(`/farms/${farmId}/equipamentos`)}
                    styles={styles}
                  />
                  <MoreRow
                    icon="⛅"
                    title="Clima"
                    subtitle="Alertas de geada, chuva, calor e vento"
                    onPress={() => router.push(`/farms/${farmId}/clima`)}
                    styles={styles}
                  />
                  <MoreRow
                    icon="🌙"
                    title="Fechamento do dia"
                    subtitle="Ponto, coletas e alertas antes de encerrar"
                    onPress={() => router.push(`/farms/${farmId}/fechamento`)}
                    styles={styles}
                  />
                  <MoreRow
                    icon="🎙️"
                    title="Ei FarmPro"
                    subtitle="Pergunte por voz sobre clima, lotes e mais"
                    onPress={() => router.push(`/farms/${farmId}/comando-de-voz`)}
                    styles={styles}
                  />
                </View>
              </View>
            </FadeSlideIn>
          }
          ListEmptyComponent={<EmptyState text={t('lavouraHome.empty')} />}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={Math.min(index, 6) * 50}>
              <PlotCard
                plot={item}
                styles={styles}
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

/** Linha compacta pra um item que não é sobre talhão/safra (funcionários,
 * clima, etc.) — mesma cara das linhas "soltas" que a home da fazenda tinha
 * antes de ficar só com Lavoura/Pecuária. */
function MoreRow({
  icon,
  title,
  subtitle,
  onPress,
  styles,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.moreRow, pressed && styles.moreRowPressed]} onPress={onPress}>
      <Text style={styles.moreRowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.moreRowTitle}>{title}</Text>
        <Text style={styles.moreRowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.moreRowChevron}>→</Text>
    </Pressable>
  );
}

function PlotCard({
  plot,
  onPress,
  noSeasonLabel,
  styles,
}: {
  plot: PlotWithLatestSeason;
  onPress: () => void;
  noSeasonLabel: string;
  styles: ReturnType<typeof createStyles>;
}) {
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

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
  moreSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  moreRowPressed: {
    opacity: 0.8,
  },
  moreRowIcon: {
    fontSize: 20,
  },
  moreRowTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  moreRowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreRowChevron: {
    ...typography.heading,
    color: colors.lavoura,
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
}
