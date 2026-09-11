import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useEquipment, type EquipmentSummary } from '../../../../src/hooks/useEquipment';
import { useT, type TFunction } from '../../../../src/i18n';
import { DOCUMENT_ALERT_LABELS } from '../../../../src/lib/documentAlerts';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export default function EquipmentListScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { equipment, isLoading, reload } = useEquipment(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('equipment.title')} subtitle={t('equipment.subtitle')} />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : equipment.length === 0 ? (
          <EmptyState text={t('equipment.empty')} />
        ) : (
          equipment.map((item) => <EquipmentRow key={item.id} item={item} farmId={farmId} colors={colors} styles={styles} t={t} />)
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t('equipment.newEquipment')} onPress={() => router.push(`/farms/${farmId}/equipamentos/novo`)} />
      </View>
    </SafeAreaView>
  );
}

function EquipmentRow({
  item,
  farmId,
  colors,
  styles,
  t,
}: {
  item: EquipmentSummary;
  farmId: string | undefined;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
  t: TFunction;
}) {
  const badgeColor = item.nextDueStatus === 'vencido' ? colors.danger : item.nextDueStatus === 'vence_em_breve' ? colors.warning : colors.success;

  return (
    <Pressable onPress={() => router.push(`/farms/${farmId}/equipamentos/${item.id}`)}>
      <Card style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.nextDueStatus !== 'sem_validade' ? (
            <View style={[styles.badge, { borderColor: badgeColor }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{DOCUMENT_ALERT_LABELS[item.nextDueStatus]}</Text>
            </View>
          ) : null}
        </View>
        {item.lastMaintenance ? (
          <Text style={styles.cardSubtitle}>
            {t('equipment.lastMaintenance', {
              type: item.lastMaintenance.maintenance_type,
              date: formatDateBR(item.lastMaintenance.performed_at),
            })}
            {item.lastMaintenance.next_due_date
              ? t('equipment.nextMaintenanceSuffix', { date: formatDateBR(item.lastMaintenance.next_due_date) })
              : ''}
          </Text>
        ) : (
          <Text style={styles.cardSubtitle}>{t('equipment.noMaintenance')}</Text>
        )}
      </Card>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    loading: {
      marginTop: spacing.xl,
    },
    card: {
      gap: spacing.xs,
      borderRadius: radius.md,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    badge: {
      borderRadius: radius.full,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    badgeText: {
      ...typography.captionMedium,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
  });
}
