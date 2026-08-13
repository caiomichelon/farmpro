import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { CATTLE_INVENTORY_CATEGORY_LABELS, CATTLE_INVENTORY_UNIT_LABELS } from '../../../../../../../src/data/cattleOptions';
import {
  CATTLE_INVENTORY_STOCK_STATUS_LABELS,
  useCattleInventoryItem,
  useCattleInventoryMovements,
  type CattleInventoryStockStatus,
} from '../../../../../../../src/hooks/useCattleInventory';
import { useSuppliers } from '../../../../../../../src/hooks/useSuppliers';
import { computeExpirationStatus, EXPIRATION_STATUS_LABELS } from '../../../../../../../src/lib/inventoryExpiration';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const STATUS_COLOR_KEY: Record<CattleInventoryStockStatus, 'success' | 'warning' | 'danger' | 'textMuted'> = {
  ok: 'success',
  baixo: 'warning',
  critico: 'danger',
  sem_alerta: 'textMuted',
};

export default function InventoryItemDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, itemId } = useLocalSearchParams<{ farmId: string; itemId: string }>();
  const { item, isLoading, reload: reloadItem } = useCattleInventoryItem(itemId);
  const { movements, reload: reloadMovements } = useCattleInventoryMovements(itemId);
  const { suppliers } = useSuppliers(farmId);

  useFocusEffect(
    useCallback(() => {
      reloadItem();
      reloadMovements();
    }, [reloadItem, reloadMovements])
  );

  if (isLoading || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  const statusColor = colors[STATUS_COLOR_KEY[item.stockStatus]];
  const expirationStatus = computeExpirationStatus(item.expiration_date);
  const supplierName = suppliers.find((s) => s.id === item.supplier_id)?.name ?? null;
  const metaParts = [item.location, supplierName ? `Fornecedor: ${supplierName}` : null].filter(Boolean) as string[];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={item.name} subtitle={CATTLE_INVENTORY_CATEGORY_LABELS[item.category]} />

      <ScrollView contentContainerStyle={styles.content}>
        {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.photo} /> : null}

        {expirationStatus === 'vencido' || expirationStatus === 'vencendo' ? (
          <View
            style={[
              styles.expirationBanner,
              { backgroundColor: (expirationStatus === 'vencido' ? colors.danger : colors.warning) + '22' },
            ]}
          >
            <Text style={{ color: expirationStatus === 'vencido' ? colors.danger : colors.warning, ...typography.captionMedium }}>
              {EXPIRATION_STATUS_LABELS[expirationStatus]} — validade em {formatDate(item.expiration_date as string)}
            </Text>
          </View>
        ) : null}

        {metaParts.length > 0 ? <Text style={styles.metaLine}>{metaParts.join(' · ')}</Text> : null}

        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.currentQuantity.toLocaleString('pt-BR')} {CATTLE_INVENTORY_UNIT_LABELS[item.unit]}
          </Text>
          <Text style={[styles.statusSubtext, { color: statusColor }]}>{CATTLE_INVENTORY_STOCK_STATUS_LABELS[item.stockStatus]}</Text>
          {item.min_quantity !== null ? (
            <Text style={styles.statusMeta}>
              Mínimo: {Number(item.min_quantity).toLocaleString('pt-BR')} {CATTLE_INVENTORY_UNIT_LABELS[item.unit]}
            </Text>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          <QuickAction
            label="+ Entrada"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/estoque/item/${itemId}/nova-movimentacao?type=entrada`)}
            styles={styles}
          />
          <QuickAction
            label="− Saída"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/estoque/item/${itemId}/nova-movimentacao?type=saida`)}
            styles={styles}
          />
        </View>

        {item.unit_cost !== null ? (
          <View style={styles.summaryGrid}>
            <SummaryStat label="Custo/unidade" value={Number(item.unit_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} styles={styles} />
            <SummaryStat
              label="Valor em estoque"
              value={(item.currentQuantity * Number(item.unit_cost)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              styles={styles}
            />
          </View>
        ) : null}

        <Section title="Movimentações" styles={styles}>
          {movements.length === 0 ? (
            <EmptyState text="Nenhuma movimentação registrada ainda." />
          ) : (
            movements.map((m) => (
              <Card key={m.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowValue, { color: m.type === 'entrada' ? colors.success : colors.danger }]}>
                    {m.type === 'entrada' ? '+ ' : '− '}
                    {Number(m.quantity).toLocaleString('pt-BR')} {CATTLE_INVENTORY_UNIT_LABELS[item.unit]}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(m.moved_at)}</Text>
                </View>
                {m.lotName ? <Text style={styles.rowNotes}>Lote: {m.lotName}</Text> : null}
                {m.notes ? <Text style={styles.rowNotes}>{m.notes}</Text> : null}
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ label, onPress, styles }: { label: string; onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickActionButton, pressed && styles.quickActionPressed]} onPress={onPress}>
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function SummaryStat({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
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
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.xxl,
    },
    photo: {
      width: '100%',
      height: 180,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceAlt,
    },
    expirationBanner: {
      borderRadius: radius.md,
      padding: spacing.md,
    },
    metaLine: {
      ...typography.caption,
      color: colors.textMuted,
    },
    statusBadge: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: 2,
    },
    statusText: {
      ...typography.displayMd,
    },
    statusSubtext: {
      ...typography.subheading,
    },
    statusMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    quickActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    quickActionButton: {
      flex: 1,
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    quickActionPressed: {
      opacity: 0.7,
    },
    quickActionText: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    summaryCell: {
      flexBasis: '47%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    summaryValue: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    summaryLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    sectionBody: {
      gap: spacing.md,
    },
    rowCard: {
      gap: 2,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowValue: {
      ...typography.bodyMedium,
    },
    rowDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
    rowNotes: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
