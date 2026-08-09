import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { StatGrid } from '../../../../../src/components/StatGrid';
import { useBreedingCows } from '../../../../../src/hooks/useBreedingCows';
import { useWeaningRate } from '../../../../../src/hooks/useWeaningRate';
import { useT } from '../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

export default function ReproductiveIndicatorsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading: isLoadingCows, reload: reloadCows } = useBreedingCows(farmId);
  const { data: weaningRate, isLoading: isLoadingWeaning, reload: reloadWeaning } = useWeaningRate(farmId);
  const t = useT();

  useFocusEffect(
    useCallback(() => {
      reloadCows();
      reloadWeaning();
    }, [reloadCows, reloadWeaning])
  );

  const isLoading = isLoadingCows || isLoadingWeaning;

  const pregnantCount = cows.filter((c) => c.isPregnant).length;
  const pregnancyRate = cows.length > 0 ? (pregnantCount / cows.length) * 100 : 0;
  const intervalCows = cows.filter((c) => c.avgCalvingIntervalDays !== null);
  const avgHerdCalvingInterval =
    intervalCows.length > 0
      ? intervalCows.reduce((sum, c) => sum + (c.avgCalvingIntervalDays ?? 0), 0) / intervalCows.length
      : null;

  const hasData = cows.length > 0 || (weaningRate?.totalCalvings ?? 0) > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('reproductiveIndicators.title')} subtitle={t('reproductiveIndicators.subtitle')} />
      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : !hasData ? (
        <EmptyState text={t('reproductiveIndicators.noData')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <StatGrid
            stats={[
              { label: t('reproductiveIndicators.statPregnancyRate'), value: `${pregnancyRate.toFixed(0)}%` },
              {
                label: t('reproductiveIndicators.statWeaningRate'),
                value: weaningRate?.weaningRatePct !== null && weaningRate?.weaningRatePct !== undefined ? `${weaningRate.weaningRatePct.toFixed(0)}%` : '—',
              },
              {
                label: t('reproductiveIndicators.statCalvingInterval'),
                value: avgHerdCalvingInterval !== null ? `${Math.round(avgHerdCalvingInterval)} dias` : '—',
              },
            ]}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('reproductiveIndicators.weaningByYearTitle')}</Text>
            <Text style={styles.sectionSubtitle}>{t('reproductiveIndicators.weaningByYearSubtitle')}</Text>
            {!weaningRate || weaningRate.byYear.length === 0 ? (
              <EmptyState text={t('reproductiveIndicators.weaningByYearEmpty')} />
            ) : (
              <Card style={styles.yearCard}>
                {weaningRate.byYear.map((y) => (
                  <View key={y.year} style={styles.yearRow}>
                    <Text style={styles.yearRowText}>
                      {t('reproductiveIndicators.yearRow', {
                        year: String(y.year),
                        weaned: String(y.totalWeaned),
                        total: String(y.totalCalvings),
                        pct: y.weaningRatePct.toFixed(0),
                      })}
                    </Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.min(100, y.weaningRatePct)}%`, backgroundColor: colors.pecuaria }]} />
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
      gap: spacing.lg,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
    yearCard: {
      gap: spacing.md,
    },
    yearRow: {
      gap: 4,
    },
    yearRowText: {
      ...typography.captionMedium,
      color: colors.textPrimary,
    },
    barTrack: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: radius.full,
    },
  });
}
