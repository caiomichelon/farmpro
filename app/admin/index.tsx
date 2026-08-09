import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SimpleChart } from '../../src/components/SimpleChart';
import { StatGrid } from '../../src/components/StatGrid';
import { useAdminDashboard } from '../../src/hooks/useAdminDashboard';
import { radius, spacing, typography, useColors, type Colors } from '../../src/theme';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminDashboardScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { stats, isLoading, error } = useAdminDashboard();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="📈 Painel administrativo" subtitle="Dados reais de uso do FarmPro" />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : error || !stats ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Sem acesso</Text>
            <Text style={styles.errorText}>
              Esse painel só é visível pra conta administradora. Se você acha que devia ter acesso, confere se está
              logado com o e-mail certo.
            </Text>
            <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <StatGrid
              stats={[
                { label: 'Fazendas cadastradas', value: String(stats.totalFarms) },
                { label: 'Usuários (contas)', value: String(stats.totalUsers) },
                { label: 'Cadastros — 7 dias', value: String(stats.signupsLast7d) },
                { label: 'Cadastros — 30 dias', value: String(stats.signupsLast30d) },
                { label: 'Ativos — 7 dias', value: String(stats.activeLast7d) },
                { label: 'Ativos — 30 dias', value: String(stats.activeLast30d) },
              ]}
            />

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Fazendas criadas por dia</Text>
              <Text style={styles.cardSubtitle}>Últimos 30 dias</Text>
              <SimpleChart
                type="barras"
                color={colors.lavoura}
                data={stats.farmsByDay.map((d) => ({ label: d.day, value: d.count }))}
              />
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Contas criadas por dia</Text>
              <Text style={styles.cardSubtitle}>Últimos 30 dias</Text>
              <SimpleChart
                type="barras"
                color={colors.funcionarios}
                data={stats.usersByDay.map((d) => ({ label: d.day, value: d.count }))}
              />
            </Card>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Últimas fazendas cadastradas</Text>
              {stats.recentFarms.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma fazenda cadastrada ainda.</Text>
              ) : (
                stats.recentFarms.map((farm, index) => (
                  <View key={`${farm.name}-${index}`} style={styles.farmRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.farmName}>{farm.name}</Text>
                      {farm.city || farm.state ? (
                        <Text style={styles.farmLocation}>{[farm.city, farm.state].filter(Boolean).join(' / ')}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.farmDate}>{formatDate(farm.created_at)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    errorBox: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xxl,
    },
    errorTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    errorText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
    },
    card: {
      gap: 2,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    farmRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    farmName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    farmLocation: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    farmDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
