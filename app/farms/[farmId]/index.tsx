import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/Card';
import { CommodityTicker } from '../../../src/components/CommodityTicker';
import { FadeSlideIn } from '../../../src/components/FadeSlideIn';
import { HealthGauge } from '../../../src/components/HealthGauge';
import { OfflineSyncBanner } from '../../../src/components/OfflineSyncBanner';
import { SectorButton } from '../../../src/components/SectorButton';
import { SummaryStat } from '../../../src/components/SummaryStat';
import { useFarm } from '../../../src/hooks/useFarms';
import { useFarmHealthScore } from '../../../src/hooks/useFarmHealthScore';
import { useSyncCattleNotifications } from '../../../src/hooks/useSyncCattleNotifications';
import { useSyncDailyBriefingNotification } from '../../../src/hooks/useSyncDailyBriefingNotification';
import { useSyncDailyPhotoReminder } from '../../../src/hooks/useSyncDailyPhotoReminder';
import { useSyncEndOfDayNotification } from '../../../src/hooks/useSyncEndOfDayNotification';
import { useSyncWeatherNotifications } from '../../../src/hooks/useSyncWeatherNotifications';
import { useT } from '../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

export default function FarmHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading } = useFarm(farmId);
  const health = useFarmHealthScore(farmId);
  const alerts = health.alerts;
  useSyncCattleNotifications(farmId);
  useSyncWeatherNotifications(farmId);
  useSyncDailyBriefingNotification(farmId);
  useSyncEndOfDayNotification(farmId);
  useSyncDailyPhotoReminder(farmId);

  return (
    <View style={styles.container}>
      <CommodityTicker />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => router.push('/farms')} hitSlop={12}>
              <Text style={styles.backLink}>{t('farmHome.switchFarm')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/farms/${farmId}/buscar`)} hitSlop={12}>
              <Text style={styles.backLink}>🔎 Buscar</Text>
            </Pressable>
          </View>

          {isLoading || !farm ? (
            <ActivityIndicator color={colors.textInverse} style={{ marginTop: spacing.lg }} />
          ) : (
            <>
              <Text style={styles.farmName}>{farm.name}</Text>
              <View style={styles.statsRow}>
                <SummaryStat label={t('farmHome.totalHectares')} value={`${farm.totalHectares.toLocaleString('pt-BR')} ha`} />
                <SummaryStat label={t('farmHome.plots')} value={String(farm.totalPlots)} />
                <SummaryStat label={t('farmHome.lavoura')} value={`${farm.lavouraHectares.toLocaleString('pt-BR')} ha`} />
                <SummaryStat label={t('farmHome.pecuaria')} value={`${farm.pecuariaHectares.toLocaleString('pt-BR')} ha`} />
              </View>
            </>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <OfflineSyncBanner />

          {!health.isLoading ? (
            <FadeSlideIn>
              <Pressable
                style={({ pressed }) => [styles.healthCardWrap, pressed && styles.employeesRowPressed]}
                onPress={() => router.push(`/farms/${farmId}/saude-da-fazenda`)}
              >
                <Card style={styles.healthCard}>
                  <View style={styles.healthCardTopRow}>
                    <Text style={styles.healthCardTitle}>{t('farmHealth.homeCardTitle')}</Text>
                    <Text style={styles.employeesChevron}>→</Text>
                  </View>
                  <HealthGauge score={health.score} level={health.level} compact />
                </Card>
              </Pressable>
            </FadeSlideIn>
          ) : null}

          {alerts.length > 0 ? (
            <View style={styles.alertsSection}>
              <Text style={styles.alertsTitle}>
                {alerts.some((a) => a.severity === 'danger') ? '⚠ ' : ''}
                {t('farmHome.alerts')} ({alerts.length})
              </Text>
              {alerts.slice(0, 4).map((alert) => (
                <Pressable
                  key={alert.id}
                  style={({ pressed }) => [
                    styles.alertCard,
                    alert.severity === 'danger' ? styles.alertCardDanger : styles.alertCardWarning,
                    pressed && styles.employeesRowPressed,
                  ]}
                  onPress={() => router.push(alert.href as never)}
                >
                  <Text
                    style={[
                      styles.alertTitle,
                      { color: alert.severity === 'danger' ? colors.danger : colors.warning },
                    ]}
                  >
                    {alert.title}
                  </Text>
                  {alert.description ? <Text style={styles.alertDescription}>{alert.description}</Text> : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          <FadeSlideIn>
            <View style={styles.sectorsRow}>
              <SectorButton
                title={t('farmHome.lavoura')}
                subtitle={t('farmHome.lavouraSubtitle')}
                color={colors.lavoura}
                backgroundColor={colors.lavouraLight}
                onPress={() => router.push(`/farms/${farmId}/lavoura`)}
              />
              <SectorButton
                title={t('farmHome.pecuaria')}
                subtitle={t('farmHome.pecuariaSubtitle')}
                color={colors.pecuaria}
                backgroundColor={colors.pecuariaLight}
                onPress={() => router.push(`/farms/${farmId}/pecuaria`)}
              />
            </View>
          </FadeSlideIn>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backLink: {
      ...typography.captionMedium,
      color: colors.textInverse,
      opacity: 0.75,
    },
    farmName: {
      ...typography.displayMd,
      color: colors.textInverse,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xl,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    healthCardWrap: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
    healthCard: {
      gap: spacing.xs,
    },
    healthCardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    healthCardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    alertsSection: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      gap: spacing.sm,
    },
    alertsTitle: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    alertCard: {
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: 2,
    },
    alertCardDanger: {
      backgroundColor: colors.dangerLight,
      borderColor: colors.danger,
    },
    alertCardWarning: {
      backgroundColor: colors.warningLight,
      borderColor: colors.warning,
    },
    alertTitle: {
      ...typography.bodyMedium,
    },
    alertDescription: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sectorsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.xl,
    },
    employeesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: spacing.xl,
      marginTop: -spacing.md,
      marginBottom: spacing.xl,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
    },
    employeesRowPressed: {
      opacity: 0.8,
    },
    employeesMarker: {
      width: 4,
      height: 32,
      borderRadius: 999,
    },
    employeesTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    employeesSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    employeesChevron: {
      ...typography.heading,
      color: colors.funcionarios,
    },
  });
}
