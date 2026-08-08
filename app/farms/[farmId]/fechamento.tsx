import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useEndOfDaySummary } from '../../../src/hooks/useEndOfDaySummary';
import { spacing, typography, useColors, type Colors } from '../../../src/theme';

export default function EndOfDayScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { summary, openAlertsCount, isLoading, error, reload } = useEndOfDaySummary(farmId);

  if (error && !summary) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="Fechamento do dia" subtitle="O que ficou pra trás antes de encerrar o expediente" />
        <View style={styles.content}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={reload}>
            <Text style={styles.retryLink}>Tentar de novo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !summary) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const allGood = summary.employeesWithoutPontoToday.length === 0 && openAlertsCount === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Fechamento do dia" subtitle="O que ficou pra trás antes de encerrar o expediente" />

      <ScrollView contentContainerStyle={styles.content}>
        {allGood ? (
          <Card style={styles.successCard}>
            <Text style={styles.cardTitle}>Tudo certo por hoje ✓</Text>
            <Text style={styles.infoText}>Ponto batido, sem alertas em aberto. Bom descanso!</Text>
          </Card>
        ) : null}

        <Card style={summary.employeesWithoutPontoToday.length > 0 ? styles.warningCard : styles.card}>
          <Text style={styles.cardTitle}>Ponto digital</Text>
          {summary.employeesWithoutPontoToday.length === 0 ? (
            <Text style={styles.infoText}>
              {summary.activeEmployeeCount > 0
                ? 'Todo mundo bateu ponto hoje.'
                : 'Nenhum funcionário ativo cadastrado.'}
            </Text>
          ) : (
            <>
              <Text style={styles.infoText}>
                {summary.employeesWithoutPontoToday.length} de {summary.activeEmployeeCount} ainda não bateram ponto
                hoje:
              </Text>
              <Text style={styles.listText}>{summary.employeesWithoutPontoToday.join(', ')}</Text>
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Coletas de campo</Text>
          <Text style={styles.infoText}>
            {summary.fieldCollectionsToday === 0
              ? 'Nenhuma coleta registrada hoje.'
              : `${summary.fieldCollectionsToday} ${summary.fieldCollectionsToday === 1 ? 'coleta registrada' : 'coletas registradas'} hoje.`}
          </Text>
        </Card>

        <Card
          style={openAlertsCount > 0 ? styles.warningCard : styles.card}
          onPress={openAlertsCount > 0 ? () => router.push(`/farms/${farmId}`) : undefined}
        >
          <Text style={styles.cardTitle}>Alertas em aberto</Text>
          <Text style={styles.infoText}>
            {openAlertsCount === 0
              ? 'Nenhum alerta pendente.'
              : `${openAlertsCount} ${openAlertsCount === 1 ? 'alerta pendente' : 'alertas pendentes'} — toque pra ver na home da fazenda.`}
          </Text>
        </Card>
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
    loading: {
      marginTop: spacing.xxl,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    errorText: {
      ...typography.body,
      color: colors.danger,
    },
    retryLink: {
      ...typography.bodyMedium,
      color: colors.primary,
    },
    card: {
      gap: spacing.xs,
    },
    warningCard: {
      gap: spacing.xs,
      borderColor: colors.warning,
      backgroundColor: colors.warningLight,
    },
    successCard: {
      gap: spacing.xs,
      borderColor: colors.successLight,
      backgroundColor: colors.successLight,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    infoText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    listText: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
  });
}
