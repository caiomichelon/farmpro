import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { useGrainSales } from '../../../../../../src/hooks/useGrainSales';
import { useT } from '../../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SalesScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  const { sales, totalSacasSold, totalValue, totalFreight, netValue, isLoading, error, reload } = useGrainSales(seasonId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('sales.title')} subtitle={t('sales.subtitle', { sacas: totalSacasSold.toLocaleString('pt-BR') })} />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {sales.length > 0 ? (
            <FadeSlideIn>
              <Card style={styles.summaryCard}>
                <SummaryCell label={t('sales.summaryGross')} value={formatCurrency(totalValue)} styles={styles} />
                <View style={styles.summaryDivider} />
                <SummaryCell label={t('sales.summaryFreight')} value={formatCurrency(totalFreight)} styles={styles} muted />
                <View style={styles.summaryDivider} />
                <SummaryCell label={t('sales.summaryNet')} value={formatCurrency(netValue)} styles={styles} highlight />
              </Card>
            </FadeSlideIn>
          ) : null}

          {sales.length === 0 ? (
            <EmptyState text={t('sales.empty')} />
          ) : (
            sales.map((sale, index) => {
              const transportInfo = [sale.carrier_name, sale.truck_plate].filter(Boolean).join(' · ');
              return (
                <FadeSlideIn key={sale.id} delay={Math.min(index, 6) * 50}>
                  <Card style={styles.rowCard}>
                    <View style={styles.rowTopRow}>
                      {sale.photo_url ? <Image source={{ uri: sale.photo_url }} style={styles.rowThumbnail} /> : null}
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.rowValue}>{sale.buyerName ?? t('sales.buyerUnknown')}</Text>
                          <Text style={styles.rowDate}>{formatDate(sale.sale_date)}</Text>
                        </View>
                        <Text style={styles.rowNotes}>
                          {t('sales.rowSummary', {
                            sacas: Number(sale.quantity_sacas).toLocaleString('pt-BR'),
                            price: formatCurrency(Number(sale.price_per_saca)),
                            total: formatCurrency(Number(sale.quantity_sacas) * Number(sale.price_per_saca)),
                          })}
                        </Text>
                        {transportInfo ? <Text style={styles.rowTransport}>{t('sales.truckInfo', { info: transportInfo })}</Text> : null}
                        {sale.freight_cost !== null ? (
                          <Text style={styles.rowNotes}>{t('sales.freightNote', { value: formatCurrency(Number(sale.freight_cost)) })}</Text>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </FadeSlideIn>
              );
            })
          )}

          <Button label={t('sales.newSale')} onPress={() => router.push(`/farms/${farmId}/lavoura/safra/${seasonId}/nova-venda`)} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryCell({
  label,
  value,
  styles,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={styles.summaryCell}>
      <Text
        style={[styles.summaryValue, highlight && styles.summaryValueHighlight, muted && styles.summaryValueMuted]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
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
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    summaryCell: {
      flex: 1,
      gap: 2,
    },
    summaryDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    summaryValue: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    summaryValueHighlight: {
      color: colors.lavoura,
    },
    summaryValueMuted: {
      color: colors.textSecondary,
    },
    summaryLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    rowCard: {
      gap: 2,
    },
    rowTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    rowThumbnail: {
      width: 48,
      height: 48,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceAlt,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    rowDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
    rowNotes: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rowTransport: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    error: {
      color: colors.danger,
    },
  });
}
