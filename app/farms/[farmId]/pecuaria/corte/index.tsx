import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../src/components/FadeSlideIn';
import { FinancialSummary } from '../../../../../src/components/FinancialSummary';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { StatGrid } from '../../../../../src/components/StatGrid';
import { CATTLE_LOT_STATUS_LABELS } from '../../../../../src/data/cattleOptions';
import { getCommodityQuotes } from '../../../../../src/data/commodities';
import {
  CATTLE_LOT_READINESS_LABELS,
  useCattleLots,
  type CattleLotReadiness,
  type CattleLotSummary,
} from '../../../../../src/hooks/useCattleLots';
import { useT, type TFunction } from '../../../../../src/i18n';
import { buildSellRecommendations } from '../../../../../src/lib/sellRecommendation';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

const READINESS_COLOR_KEY: Record<CattleLotReadiness, 'success' | 'pecuaria' | 'textMuted'> = {
  pronto: 'success',
  engordando: 'pecuaria',
  recem_chegado: 'textMuted',
};

export default function CorteHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading, error, reload } = useCattleLots(farmId);
  const [boiGordoPrice, setBoiGordoPrice] = useState(0);
  const t = useT();

  // "Novo lote" é uma rota separada — refaz a busca ao voltar pra cá.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    getCommodityQuotes().then((quotes) => {
      setBoiGordoPrice(quotes.find((q) => q.id === 'boi-gordo')?.price ?? 0);
    });
  }, []);

  const activeLots = lots.filter((l) => l.status === 'ativo');
  const totalHead = activeLots.reduce((sum, l) => sum + l.currentHeadCount, 0);
  const gmdValues = activeLots.map((l) => l.gmdKgPerDay).filter((v): v is number => v !== null);
  const avgGmd = gmdValues.length > 0 ? gmdValues.reduce((sum, v) => sum + v, 0) / gmdValues.length : null;
  const avgMortality =
    lots.length > 0 ? lots.reduce((sum, l) => sum + l.mortalityRatePct, 0) / lots.length : 0;
  const readyLots = activeLots.filter((l) => l.readiness === 'pronto');
  const totalCost = activeLots.reduce((sum, l) => sum + l.totalCost, 0);
  const totalRevenue = activeLots.reduce((sum, l) => sum + l.projectedRevenue, 0);
  const sellRecommendations = buildSellRecommendations(activeLots, boiGordoPrice);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('corteHome.title')}
        subtitle={`${lots.length} ${lots.length === 1 ? t('corteHome.lotSingular') : t('corteHome.lotPlural')} · ${totalHead.toLocaleString('pt-BR')} ${t('corteHome.headsSuffix')}`}
        right={
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animais`)} hitSlop={12}>
              <Text style={styles.headerLink}>{t('corteHome.animals')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/frigorificos`)} hitSlop={12}>
              <Text style={styles.headerLink}>{t('corteHome.packingPlants')}</Text>
            </Pressable>
          </View>
        }
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : (
        <FlatList
          data={lots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <FadeSlideIn>
            <View style={styles.headerContent}>
              <StatGrid
                stats={[
                  { label: t('corteHome.statActiveLots'), value: String(activeLots.length) },
                  { label: t('corteHome.statTotalHeads'), value: totalHead.toLocaleString('pt-BR') },
                  { label: t('corteHome.statAvgGmd'), value: avgGmd !== null ? `${avgGmd.toFixed(2)} kg/dia` : '—' },
                  { label: t('corteHome.statAvgMortality'), value: `${avgMortality.toFixed(1)}%` },
                ]}
              />

              {readyLots.length > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.readyBanner, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/prontos-para-abate`)}
                >
                  <Text style={styles.readyBannerText}>
                    ✓ {readyLots.length} {readyLots.length === 1 ? t('corteHome.readyLotSingular') : t('corteHome.readyLotPlural')}{' '}
                    {t('corteHome.readyBannerSuffix')}
                  </Text>
                  <Text style={styles.readyBannerChevron}>→</Text>
                </Pressable>
              ) : null}

              {sellRecommendations.length > 0 ? (
                <View style={styles.sellBanner}>
                  <Text style={styles.sellBannerTitle}>{t('corteHome.sellBannerTitle')}</Text>
                  {sellRecommendations.map((rec) => (
                    <Pressable
                      key={rec.lotId}
                      style={({ pressed }) => [styles.sellBannerRow, pressed && styles.rowPressed]}
                      onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${rec.lotId}`)}
                    >
                      <Text style={styles.sellBannerRowText}>
                        {t('corteHome.sellBannerRow', {
                          name: rec.lotName,
                          margin: rec.marginPct.toFixed(0),
                          cost: rec.costPerArroba.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                          price: rec.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <FinancialSummary cost={totalCost} revenue={totalRevenue} margin={totalRevenue - totalCost} />

              <View style={styles.linksRow}>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/planilha`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkLotSheet')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/abates`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkSlaughterSheet')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/financeiro`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkFinancialByLot')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/benchmarking`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkBenchmarking')}</Text>
                </Pressable>
              </View>
              <View style={styles.linksRow}>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/prontos-para-abate`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkReadyForSlaughter')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/repasse`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkTransfer')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/vacinas-pendentes`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkPendingVaccines')}</Text>
                </Pressable>
              </View>
              <View style={styles.linksRow}>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/importar`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkImportLots')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/protocolos`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkProtocols')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/painel-de-campo`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkFieldPanel')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/comparativo-regional`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkRegionalComparison')}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/pastos`)} hitSlop={8}>
                  <Text style={styles.link}>{t('corteHome.linkPastures')}</Text>
                </Pressable>
              </View>
            </View>
            </FadeSlideIn>
          }
          ListEmptyComponent={<EmptyState text={t('corteHome.empty')} />}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={Math.min(index, 6) * 50}>
              <LotCard lot={item} styles={styles} colors={colors} t={t} onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${item.id}`)} />
            </FadeSlideIn>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button label={t('corteHome.newLot')} onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/novo-lote`)} />
      </View>
    </SafeAreaView>
  );
}

function LotCard({
  lot,
  onPress,
  styles,
  colors,
  t,
}: {
  lot: CattleLotSummary;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
  t: TFunction;
}) {
  const readinessColor = colors[READINESS_COLOR_KEY[lot.readiness]];
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{lot.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{CATTLE_LOT_STATUS_LABELS[lot.status]}</Text>
        </View>
      </View>
      {lot.status === 'ativo' ? (
        <View style={[styles.readinessBadge, { backgroundColor: readinessColor + '22' }]}>
          <Text style={[styles.readinessBadgeText, { color: readinessColor }]}>
            {CATTLE_LOT_READINESS_LABELS[lot.readiness]}
          </Text>
        </View>
      ) : null}
      <View style={styles.cardStatsRow}>
        <Text style={styles.cardStat}>{lot.currentHeadCount} {t('corteHome.headsSuffix')}</Text>
        <Text style={styles.cardStatDivider}>·</Text>
        <Text style={styles.cardStat}>{lot.latestWeightKg.toFixed(0)} {t('corteHome.avgWeightSuffix')}</Text>
        {lot.gmdKgPerDay !== null ? (
          <>
            <Text style={styles.cardStatDivider}>·</Text>
            <Text style={styles.cardStat}>GMD {lot.gmdKgPerDay.toFixed(2)} kg/dia</Text>
          </>
        ) : null}
      </View>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerLinks: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    headerLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      flexGrow: 1,
    },
    headerContent: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    readyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.successLight,
      borderWidth: 1,
      borderColor: colors.success,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    rowPressed: {
      opacity: 0.8,
    },
    readyBannerText: {
      ...typography.bodyMedium,
      color: colors.success,
      flex: 1,
    },
    readyBannerChevron: {
      ...typography.heading,
      color: colors.success,
    },
    sellBanner: {
      backgroundColor: colors.accent + '1A',
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.xs,
    },
    sellBannerTitle: {
      ...typography.bodyMedium,
      color: colors.accent,
    },
    sellBannerRow: {
      paddingVertical: 2,
    },
    sellBannerRowText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    linksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    link: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    linkDivider: {
      color: colors.textMuted,
    },
    card: {
      marginBottom: spacing.md,
      gap: spacing.xs,
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
    statusBadge: {
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    statusBadgeText: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    readinessBadge: {
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    readinessBadgeText: {
      ...typography.captionMedium,
    },
    cardStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.xs,
    },
    cardStat: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    cardStatDivider: {
      color: colors.textMuted,
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
