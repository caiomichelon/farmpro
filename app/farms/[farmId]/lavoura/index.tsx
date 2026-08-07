import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { FinancialSummary } from '../../../../src/components/FinancialSummary';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { StatGrid } from '../../../../src/components/StatGrid';
import { useLavouraSummary } from '../../../../src/hooks/useLavouraSummary';
import { usePlotsWithLatestSeason, type PlotWithLatestSeason } from '../../../../src/hooks/usePlots';
import { colors, radius, spacing, typography } from '../../../../src/theme';

export default function LavouraHomeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { plots, isLoading, error, reload } = usePlotsWithLatestSeason(farmId);
  const { summary, reload: reloadSummary } = useLavouraSummary(farmId);

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
        title="Lavoura"
        subtitle={`${summary.totalPlots} ${summary.totalPlots === 1 ? 'talhão' : 'talhões'} · ${summary.totalHectares.toLocaleString('pt-BR')} ha`}
        right={
          <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/compradores`)} hitSlop={12}>
            <Text style={styles.headerLink}>Compradores</Text>
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
            <View style={styles.headerContent}>
              <StatGrid
                stats={[
                  { label: 'Talhões', value: String(summary.totalPlots) },
                  { label: 'Área total', value: `${summary.totalHectares.toLocaleString('pt-BR')} ha` },
                  { label: 'Safras em andamento', value: String(summary.activeSeasons) },
                  {
                    label: 'Produtividade média',
                    value: summary.avgYieldPerHectare !== null ? `${summary.avgYieldPerHectare.toFixed(1)} sc/ha` : '—',
                  },
                ]}
              />
              <FinancialSummary cost={summary.totalCost} revenue={summary.totalRevenue} margin={summary.margin} />
              <View style={styles.linksRow}>
                <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/planilha`)} hitSlop={8}>
                  <Text style={styles.link}>Planilha de talhões</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/lavoura/safras`)} hitSlop={8}>
                  <Text style={styles.link}>Planilha de safras</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={<EmptyState text="Nenhum talhão cadastrado ainda. Comece criando o primeiro." />}
          renderItem={({ item }) => (
            <PlotCard plot={item} onPress={() => router.push(`/farms/${farmId}/lavoura/talhao/${item.id}`)} />
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button label="+ Novo talhão" onPress={() => router.push(`/farms/${farmId}/lavoura/novo-talhao`)} />
      </View>
    </SafeAreaView>
  );
}

function PlotCard({ plot, onPress }: { plot: PlotWithLatestSeason; onPress: () => void }) {
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
        <Text style={styles.noCropText}>Sem safra lançada</Text>
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
