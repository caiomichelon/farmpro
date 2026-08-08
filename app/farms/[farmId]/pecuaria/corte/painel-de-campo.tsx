import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import {
  CATTLE_FIELD_COLLECTION_STATUS_COLOR_KEY,
  CATTLE_FIELD_COLLECTION_STATUS_LABELS,
} from '../../../../../src/data/cattleOptions';
import { useCattleFieldCollectionsByFarm } from '../../../../../src/hooks/useCattleFieldCollections';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import type { CattleFieldCollectionCategory, CattleFieldCollectionStatus } from '../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

const CATEGORIES: { key: CattleFieldCollectionCategory; label: string }[] = [
  { key: 'suplementacao', label: 'Suplem.' },
  { key: 'altura_forragem', label: 'Forragem' },
  { key: 'rebanho', label: 'Rebanho' },
  { key: 'aguada', label: 'Aguada' },
  { key: 'sanidade', label: 'Sanidade' },
  { key: 'cerca', label: 'Cerca' },
];

const CELL_WIDTH = 90;
const LOT_COL_WIDTH = 140;

/** Painel de campo: uma bolinha colorida por lote × categoria com a
 * situação mais recente registrada — visão geral de tudo que foi checado
 * no pasto sem abrir lote por lote. Inspirado num app de monitoramento de
 * campo que já é usado no setor. */
export default function FieldPanelScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading: isLoadingLots, reload: reloadLots } = useCattleLots(farmId);
  const { latestByLot, isLoading: isLoadingCollections, reload: reloadCollections } = useCattleFieldCollectionsByFarm(farmId);

  useFocusEffect(
    useCallback(() => {
      reloadLots();
      reloadCollections();
    }, [reloadLots, reloadCollections])
  );

  const activeLots = lots.filter((l) => l.status === 'ativo');
  const isLoading = isLoadingLots || isLoadingCollections;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Painel de campo" subtitle="Situação mais recente de cada lote, categoria por categoria" />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : activeLots.length === 0 ? (
        <EmptyState text="Nenhum lote ativo pra mostrar no painel." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.row}>
                <View style={[styles.cell, styles.lotCell, styles.headerCell]}>
                  <Text style={styles.headerText}>Lote</Text>
                </View>
                {CATEGORIES.map((cat) => (
                  <View key={cat.key} style={[styles.cell, styles.headerCell]}>
                    <Text style={styles.headerText}>{cat.label}</Text>
                  </View>
                ))}
              </View>

              {activeLots.map((lot) => (
                <Pressable
                  key={lot.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lot.id}`)}
                >
                  <View style={[styles.cell, styles.lotCell]}>
                    <Text style={styles.lotName} numberOfLines={1}>
                      {lot.name}
                    </Text>
                  </View>
                  {CATEGORIES.map((cat) => {
                    const latest = latestByLot[lot.id]?.[cat.key];
                    return (
                      <View key={cat.key} style={styles.cell}>
                        <StatusDot status={latest?.status ?? null} styles={styles} colors={colors} />
                      </View>
                    );
                  })}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.legend}>
            {(Object.keys(CATTLE_FIELD_COLLECTION_STATUS_LABELS) as CattleFieldCollectionStatus[]).map((status) => (
              <View key={status} style={styles.legendRow}>
                <StatusDot status={status} styles={styles} colors={colors} />
                <Text style={styles.legendText}>{CATTLE_FIELD_COLLECTION_STATUS_LABELS[status]}</Text>
              </View>
            ))}
            <View style={styles.legendRow}>
              <StatusDot status={null} styles={styles} colors={colors} />
              <Text style={styles.legendText}>Sem coleta registrada</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatusDot({
  status,
  styles,
  colors,
}: {
  status: CattleFieldCollectionStatus | null;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  if (!status) {
    return <View style={styles.dotEmpty} />;
  }
  const color = colors[CATTLE_FIELD_COLLECTION_STATUS_COLOR_KEY[status]];
  return <View style={[styles.dot, { backgroundColor: color }]} />;
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
      gap: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      opacity: 0.7,
    },
    cell: {
      width: CELL_WIDTH,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lotCell: {
      width: LOT_COL_WIDTH,
      alignItems: 'flex-start',
      paddingRight: spacing.sm,
    },
    headerCell: {
      backgroundColor: colors.surfaceAlt,
    },
    headerText: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    lotName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: radius.full,
    },
    dotEmpty: {
      width: 16,
      height: 16,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    legend: {
      gap: spacing.sm,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    legendText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
