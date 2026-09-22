import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CATTLE_LOT_STATUS_LABELS } from '../data/cattleOptions';
import { CATTLE_LOT_READINESS_LABELS, type CattleLotReadiness, type CattleLotSummary } from '../hooks/useCattleLots';
import type { TFunction } from '../i18n';
import { radius, spacing, typography, useColors, type Colors } from '../theme';
import { Card } from './Card';

const READINESS_COLOR_KEY: Record<CattleLotReadiness, 'success' | 'pecuaria' | 'textMuted'> = {
  pronto: 'success',
  engordando: 'pecuaria',
  recem_chegado: 'textMuted',
};

/** Card de lote usado tanto na lista de lotes ativos (Corte → home) quanto
 * na de lotes já abatidos (Corte → Lotes abatidos) — mesmo visual, pra não
 * ter dois jeitos diferentes de mostrar a mesma informação. */
export function CattleLotCard({ lot, onPress, t }: { lot: CattleLotSummary; onPress: () => void; t: TFunction }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  });
}
