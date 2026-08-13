import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { useFarmInventory, type FarmInventoryItem, type FarmInventorySector } from '../../../../src/hooks/useFarmInventory';
import { EXPIRATION_STATUS_LABELS } from '../../../../src/lib/inventoryExpiration';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

type SectorFilter = 'todos' | FarmInventorySector;
type SortMode = 'nome' | 'valor' | 'estoque_baixo';

const SECTOR_FILTER_OPTIONS: { value: SectorFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'lavoura', label: 'Lavoura' },
  { value: 'pecuaria', label: 'Pecuária' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'nome', label: 'Nome' },
  { value: 'valor', label: 'Maior valor' },
  { value: 'estoque_baixo', label: 'Estoque baixo primeiro' },
];

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_SEVERITY: Record<FarmInventoryItem['stockStatus'], number> = {
  critico: 0,
  baixo: 1,
  sem_alerta: 2,
  ok: 3,
};

const STOCK_STATUS_LABELS: Record<FarmInventoryItem['stockStatus'], string> = {
  ok: 'Estoque ok',
  baixo: 'Estoque baixo',
  critico: 'Esgotado',
  sem_alerta: 'Sem mínimo definido',
};

/** Painel consolidado de estoque — junta o que já existe em Pecuária e
 * Lavoura numa visão só, com busca, filtro por setor/status, valor total
 * em R$ e alertas de estoque baixo/validade vencendo. Pensado pra abrir
 * direto da home da fazenda (mesmo nível de Lavoura/Pecuária), em vez de
 * precisar entrar num setor específico só pra ver o estoque. */
export default function FarmInventoryDashboardScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { items, totalValue, lowStockCount, expiringCount, expiredCount, isLoading, error, reload } = useFarmInventory(farmId);

  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('todos');
  const [sortMode, setSortMode] = useState<SortMode>('nome');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = items.filter((i) => {
      if (sectorFilter !== 'todos' && i.sector !== sectorFilter) return false;
      if (term && !i.name.toLowerCase().includes(term) && !i.categoryLabel.toLowerCase().includes(term)) return false;
      return true;
    });
    list = [...list];
    if (sortMode === 'valor') {
      list.sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0));
    } else if (sortMode === 'estoque_baixo') {
      list.sort((a, b) => STATUS_SEVERITY[a.stockStatus] - STATUS_SEVERITY[b.stockStatus] || a.name.localeCompare(b.name, 'pt-BR'));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    return list;
  }, [items, search, sectorFilter, sortMode]);

  function openItem(item: FarmInventoryItem) {
    router.push(`/farms/${farmId}/${item.sector}/estoque/item/${item.id}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="📦 Estoque"
        subtitle={`${items.length} ${items.length === 1 ? 'item' : 'itens'} · valor total ${currency(totalValue)}`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.estoque} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <FadeSlideIn delay={30}>
            <View style={styles.statsGrid}>
              <StatCard label="Itens" value={String(items.length)} color={colors.estoque} styles={styles} />
              <StatCard label="Valor total" value={currency(totalValue)} color={colors.estoque} styles={styles} />
              <StatCard
                label="Estoque baixo"
                value={String(lowStockCount)}
                color={lowStockCount > 0 ? colors.warning : colors.textMuted}
                styles={styles}
              />
              <StatCard
                label="Vencendo/vencido"
                value={String(expiringCount + expiredCount)}
                color={expiredCount > 0 ? colors.danger : expiringCount > 0 ? colors.warning : colors.textMuted}
                styles={styles}
              />
            </View>
          </FadeSlideIn>

          <FadeSlideIn delay={60}>
            <TextField label="Buscar" value={search} onChangeText={setSearch} placeholder="Nome ou categoria do item" />
          </FadeSlideIn>

          <FadeSlideIn delay={80}>
            <View style={styles.filtersRow}>
              {SECTOR_FILTER_OPTIONS.map((opt) => (
                <Text
                  key={opt.value}
                  style={[styles.filterChip, sectorFilter === opt.value && styles.filterChipActive]}
                  onPress={() => setSectorFilter(opt.value)}
                >
                  {opt.label}
                </Text>
              ))}
            </View>
            <View style={styles.filtersRow}>
              {SORT_OPTIONS.map((opt) => (
                <Text
                  key={opt.value}
                  style={[styles.sortChip, sortMode === opt.value && styles.sortChipActive]}
                  onPress={() => setSortMode(opt.value)}
                >
                  {opt.label}
                </Text>
              ))}
            </View>
          </FadeSlideIn>

          <View style={styles.section}>
            {filtered.length === 0 ? (
              <EmptyState
                text={
                  items.length === 0
                    ? 'Nenhum item de estoque cadastrado ainda. Comece pela Lavoura ou pela Pecuária.'
                    : 'Nenhum item encontrado com esse filtro.'
                }
              />
            ) : (
              filtered.map((item, index) => (
                <FadeSlideIn key={item.id} delay={Math.min(index, 8) * 40}>
                  <ItemCard item={item} styles={styles} colors={colors} onPress={() => openItem(item)} />
                </FadeSlideIn>
              ))
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.footerButtons}>
            <Button
              label="+ Item de lavoura"
              variant="secondary"
              onPress={() => router.push(`/farms/${farmId}/lavoura/estoque/novo-item`)}
              style={{ flex: 1 }}
            />
            <Button
              label="+ Item de pecuária"
              variant="secondary"
              onPress={() => router.push(`/farms/${farmId}/pecuaria/estoque/novo-item`)}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, styles }: { label: string; value: string; color: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const SECTOR_BADGE_COLOR: Record<FarmInventorySector, keyof Colors> = {
  lavoura: 'lavoura',
  pecuaria: 'pecuaria',
};

function ItemCard({
  item,
  onPress,
  styles,
  colors,
}: {
  item: FarmInventoryItem;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  const statusColor =
    item.stockStatus === 'critico'
      ? colors.danger
      : item.stockStatus === 'baixo'
        ? colors.warning
        : item.stockStatus === 'ok'
          ? colors.success
          : colors.textMuted;
  const sectorColor = colors[SECTOR_BADGE_COLOR[item.sector]];
  const expirationColor = item.expirationStatus === 'vencido' ? colors.danger : item.expirationStatus === 'vencendo' ? colors.warning : null;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.cardThumb} />
        ) : (
          <View style={[styles.cardThumbPlaceholder, { backgroundColor: sectorColor + '22' }]}>
            <Text style={{ color: sectorColor }}>📦</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.categoryLabel} · {item.location || 'local não informado'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardQuantity}>
            {item.currentQuantity.toLocaleString('pt-BR')} {item.unitLabel}
          </Text>
          {item.totalValue !== null ? <Text style={styles.cardValue}>{currency(item.totalValue)}</Text> : null}
        </View>
      </View>
      <View style={styles.cardBadgesRow}>
        <View style={[styles.badge, { backgroundColor: sectorColor + '22' }]}>
          <Text style={[styles.badgeText, { color: sectorColor }]}>{item.sector === 'lavoura' ? 'Lavoura' : 'Pecuária'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{STOCK_STATUS_LABELS[item.stockStatus]}</Text>
        </View>
        {item.expirationStatus && expirationColor ? (
          <View style={[styles.badge, { backgroundColor: expirationColor + '22' }]}>
            <Text style={[styles.badgeText, { color: expirationColor }]}>{EXPIRATION_STATUS_LABELS[item.expirationStatus]}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statCard: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: 2,
    },
    statValue: {
      ...typography.heading,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    filterChip: {
      ...typography.captionMedium,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    filterChipActive: {
      backgroundColor: colors.estoque,
      color: colors.textInverse,
    },
    sortChip: {
      ...typography.caption,
      color: colors.textMuted,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    sortChipActive: {
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.estoque,
    },
    section: {
      gap: spacing.sm,
    },
    card: {
      gap: spacing.sm,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    cardThumb: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
    },
    cardThumbPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    cardMeta: {
      ...typography.caption,
      color: colors.textMuted,
    },
    cardQuantity: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    cardValue: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    cardBadgesRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    badgeText: {
      ...typography.captionMedium,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
  });
}
