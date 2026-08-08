import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommodityTicker } from '../../../src/components/CommodityTicker';
import { SectorButton } from '../../../src/components/SectorButton';
import { SummaryStat } from '../../../src/components/SummaryStat';
import { useFarm } from '../../../src/hooks/useFarms';
import { useFarmAlerts } from '../../../src/hooks/useFarmAlerts';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function FarmHomeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading } = useFarm(farmId);
  const { alerts } = useFarmAlerts(farmId);

  return (
    <View style={styles.container}>
      <CommodityTicker />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/farms')} hitSlop={12}>
            <Text style={styles.backLink}>← Trocar fazenda</Text>
          </Pressable>

          {isLoading || !farm ? (
            <ActivityIndicator color={colors.textInverse} style={{ marginTop: spacing.lg }} />
          ) : (
            <>
              <Text style={styles.farmName}>{farm.name}</Text>
              <View style={styles.statsRow}>
                <SummaryStat label="Hectares totais" value={`${farm.totalHectares.toLocaleString('pt-BR')} ha`} />
                <SummaryStat label="Talhões" value={String(farm.totalPlots)} />
                <SummaryStat label="Lavoura" value={`${farm.lavouraHectares.toLocaleString('pt-BR')} ha`} />
                <SummaryStat label="Pecuária" value={`${farm.pecuariaHectares.toLocaleString('pt-BR')} ha`} />
              </View>
            </>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {alerts.length > 0 ? (
            <View style={styles.alertsSection}>
              <Text style={styles.alertsTitle}>
                {alerts.some((a) => a.severity === 'danger') ? '⚠ ' : ''}Alertas ({alerts.length})
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

          <View style={styles.sectorsRow}>
            <SectorButton
              title="Lavoura"
              subtitle="Talhões, safras e custos"
              color={colors.lavoura}
              backgroundColor={colors.lavouraLight}
              onPress={() => router.push(`/farms/${farmId}/lavoura`)}
            />
            <SectorButton
              title="Pecuária"
              subtitle="Corte e cria"
              color={colors.pecuaria}
              backgroundColor={colors.pecuariaLight}
              onPress={() => router.push(`/farms/${farmId}/pecuaria`)}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.employeesRow, pressed && styles.employeesRowPressed]}
            onPress={() => router.push(`/farms/${farmId}/funcionarios`)}
          >
            <View style={[styles.employeesMarker, { backgroundColor: colors.funcionarios }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.employeesTitle}>Funcionários</Text>
              <Text style={styles.employeesSubtitle}>Ficha, ponto digital e produtividade</Text>
            </View>
            <Text style={styles.employeesChevron}>→</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.employeesRow, pressed && styles.employeesRowPressed]}
            onPress={() => router.push(`/farms/${farmId}/exportar`)}
          >
            <View style={[styles.employeesMarker, { backgroundColor: colors.textMuted }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.employeesTitle}>Exportar dados</Text>
              <Text style={styles.employeesSubtitle}>Tudo da fazenda num Excel (.xlsx)</Text>
            </View>
            <Text style={styles.employeesChevron}>→</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
