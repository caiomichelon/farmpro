import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { CATTLE_LOT_STATUS_LABELS } from '../../../../../src/data/cattleOptions';
import { useCattleLots, type CattleLotSummary } from '../../../../../src/hooks/useCattleLots';
import { colors, radius, spacing, typography } from '../../../../../src/theme';

export default function CorteHomeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading, error } = useCattleLots(farmId);

  const totalHead = lots.reduce((sum, l) => sum + l.currentHeadCount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Corte"
        subtitle={`${lots.length} ${lots.length === 1 ? 'lote' : 'lotes'} · ${totalHead.toLocaleString('pt-BR')} cabeças`}
        right={
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animais`)} hitSlop={12}>
              <Text style={styles.headerLink}>Animais</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/frigorificos`)} hitSlop={12}>
              <Text style={styles.headerLink}>Frigoríficos</Text>
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
          ListEmptyComponent={<EmptyState text="Nenhum lote cadastrado ainda. Comece criando o primeiro." />}
          renderItem={({ item }) => (
            <LotCard lot={item} onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${item.id}`)} />
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button label="+ Novo lote" onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/novo-lote`)} />
      </View>
    </SafeAreaView>
  );
}

function LotCard({ lot, onPress }: { lot: CattleLotSummary; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{lot.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{CATTLE_LOT_STATUS_LABELS[lot.status]}</Text>
        </View>
      </View>
      <View style={styles.cardStatsRow}>
        <Text style={styles.cardStat}>{lot.currentHeadCount} cabeças</Text>
        <Text style={styles.cardStatDivider}>·</Text>
        <Text style={styles.cardStat}>{lot.latestWeightKg.toFixed(0)} kg méd.</Text>
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

const styles = StyleSheet.create({
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
  cardStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
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
