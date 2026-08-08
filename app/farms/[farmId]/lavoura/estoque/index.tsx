import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { LAVOURA_INVENTORY_CATEGORY_LABELS, LAVOURA_INVENTORY_UNIT_LABELS } from '../../../../../src/data/lavouraInventoryOptions';
import {
  LAVOURA_INVENTORY_STOCK_STATUS_LABELS,
  useLavouraInventoryItems,
  type LavouraInventoryItemSummary,
  type LavouraInventoryStockStatus,
} from '../../../../../src/hooks/useLavouraInventory';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

const STATUS_COLOR_KEY: Record<LavouraInventoryStockStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  ok: 'success',
  baixo: 'warning',
  critico: 'danger',
  sem_alerta: 'textMuted',
};

export default function LavouraInventoryHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { items, isLoading, error, reload } = useLavouraInventoryItems(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const lowStockCount = items.filter((i) => i.stockStatus === 'baixo' || i.stockStatus === 'critico').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Estoque"
        subtitle={
          lowStockCount > 0
            ? `${items.length} ${items.length === 1 ? 'item' : 'itens'} · ${lowStockCount} com estoque baixo`
            : `${items.length} ${items.length === 1 ? 'item' : 'itens'}`
        }
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="Nenhum item de estoque cadastrado ainda. Comece com semente, fertilizante ou defensivo." />}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={Math.min(index, 6) * 50}>
              <ItemCard item={item} styles={styles} colors={colors} onPress={() => router.push(`/farms/${farmId}/lavoura/estoque/item/${item.id}`)} />
            </FadeSlideIn>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button label="+ Novo item" onPress={() => router.push(`/farms/${farmId}/lavoura/estoque/novo-item`)} />
      </View>
    </SafeAreaView>
  );
}

function ItemCard({
  item,
  onPress,
  styles,
  colors,
}: {
  item: LavouraInventoryItemSummary;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  const statusColor = colors[STATUS_COLOR_KEY[item.stockStatus]];
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardQuantity}>
          {item.currentQuantity.toLocaleString('pt-BR')} {LAVOURA_INVENTORY_UNIT_LABELS[item.unit]}
        </Text>
      </View>
      <View style={styles.cardBadgesRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{LAVOURA_INVENTORY_STOCK_STATUS_LABELS[item.stockStatus]}</Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{LAVOURA_INVENTORY_CATEGORY_LABELS[item.category]}</Text>
        </View>
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
    cardQuantity: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    cardBadgesRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    statusBadgeText: {
      ...typography.captionMedium,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    categoryBadgeText: {
      ...typography.captionMedium,
      color: colors.textSecondary,
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
