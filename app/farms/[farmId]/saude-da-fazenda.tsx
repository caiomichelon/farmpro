import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/Card';
import { FadeSlideIn } from '../../../src/components/FadeSlideIn';
import { HealthGauge } from '../../../src/components/HealthGauge';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useFarmHealthScore } from '../../../src/hooks/useFarmHealthScore';
import { useT } from '../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FarmHealthScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const health = useFarmHealthScore(farmId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('farmHealth.title')} subtitle={t('farmHealth.subtitle')} />

      {health.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <FadeSlideIn delay={40}>
            <Card style={styles.gaugeCard}>
              <HealthGauge score={health.score} level={health.level} />
              <Text style={styles.gaugeCaption}>
                {t('farmHealth.gaugeCaption', {
                  dangers: String(health.dangerCount),
                  warnings: String(health.warningCount),
                })}
              </Text>
            </Card>
          </FadeSlideIn>

          <FadeSlideIn delay={90}>
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('farmHealth.componentsTitle')}</Text>

              <View style={styles.componentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.componentLabel}>{t('farmHealth.alertsComponent')}</Text>
                  <Text style={styles.componentHelp}>
                    {t('farmHealth.alertsComponentHelp', {
                      dangers: String(health.dangerCount),
                      warnings: String(health.warningCount),
                    })}
                  </Text>
                </View>
                <Text style={styles.componentValue}>{Math.round(health.alertScore)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.componentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.componentLabel}>{t('farmHealth.financialComponent')}</Text>
                  <Text style={styles.componentHelp}>
                    {health.financialScore !== null
                      ? t('farmHealth.financialComponentHelp', {
                          margin: currency(health.margin),
                          cost: currency(health.totalCost),
                        })
                      : t('farmHealth.financialComponentEmpty')}
                  </Text>
                </View>
                <Text style={styles.componentValue}>{health.financialScore !== null ? Math.round(health.financialScore) : '—'}</Text>
              </View>
            </Card>
          </FadeSlideIn>

          {health.alerts.length > 0 ? (
            <FadeSlideIn delay={140}>
              <View style={styles.alertsSection}>
                <Text style={styles.sectionTitle}>{t('farmHealth.issuesTitle')}</Text>
                {health.alerts.map((alert) => (
                  <Pressable
                    key={alert.id}
                    style={({ pressed }) => [
                      styles.alertCard,
                      alert.severity === 'danger' ? styles.alertCardDanger : styles.alertCardWarning,
                      pressed && styles.alertCardPressed,
                    ]}
                    onPress={() => router.push(alert.href as never)}
                  >
                    <Text style={[styles.alertTitle, { color: alert.severity === 'danger' ? colors.danger : colors.warning }]}>
                      {alert.title}
                    </Text>
                    {alert.description ? <Text style={styles.alertDescription}>{alert.description}</Text> : null}
                  </Pressable>
                ))}
              </View>
            </FadeSlideIn>
          ) : (
            <FadeSlideIn delay={140}>
              <Card style={styles.emptyAlertsCard}>
                <Text style={styles.emptyAlertsText}>{t('farmHealth.noIssues')}</Text>
              </Card>
            </FadeSlideIn>
          )}

          <FadeSlideIn delay={190}>
            <Text style={styles.methodologyText}>{t('farmHealth.methodology')}</Text>
          </FadeSlideIn>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    gaugeCard: {
      gap: spacing.sm,
    },
    gaugeCaption: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sectionCard: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    componentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    componentLabel: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    componentHelp: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    componentValue: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    alertsSection: {
      gap: spacing.sm,
    },
    alertCard: {
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: 2,
    },
    alertCardPressed: {
      opacity: 0.8,
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
    emptyAlertsCard: {
      backgroundColor: colors.successLight,
    },
    emptyAlertsText: {
      ...typography.bodyMedium,
      color: colors.success,
    },
    methodologyText: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
