import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { EMPLOYEE_COST_TYPE_LABELS, EMPLOYEE_SECTOR_LABELS } from '../../../../../../src/data/employeeOptions';
import { useEmployee } from '../../../../../../src/hooks/useEmployees';
import { useTimeEntries } from '../../../../../../src/hooks/useTimeEntries';
import { buildEmployeeGamification } from '../../../../../../src/lib/employeeGamification';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

export default function EmployeeDetailScreen() {
  const { farmId, employeeId } = useLocalSearchParams<{ farmId: string; employeeId: string }>();
  const { employee, isLoading, reload } = useEmployee(employeeId);
  const { entries: timeEntries } = useTimeEntries(employeeId);
  const gamification = useMemo(() => buildEmployeeGamification(timeEntries), [timeEntries]);

  // Documentos/ponto/produtividade são cadastrados em rotas separadas, e
  // podem mudar a contagem de alertas mostrada aqui.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (isLoading || !employee) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      </SafeAreaView>
    );
  }

  const totalAlerts = employee.expiredDocumentCount + employee.expiringSoonDocumentCount;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={employee.full_name}
        subtitle={`${employee.role} · ${EMPLOYEE_SECTOR_LABELS[employee.sector]}`}
      />

      <View style={styles.content}>
        <View style={styles.infoGrid}>
          <InfoCell label="Admissão" value={formatDate(employee.admission_date)} />
          <InfoCell
            label={EMPLOYEE_COST_TYPE_LABELS[employee.cost_type]}
            value={Number(employee.cost_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          />
          {employee.phone ? <InfoCell label="Telefone" value={employee.phone} /> : null}
          {employee.cpf ? <InfoCell label="CPF" value={employee.cpf} /> : null}
        </View>

        <NavRow
          title="Documentos"
          subtitle={totalAlerts > 0 ? `${totalAlerts} alerta(s) de vencimento` : 'Nenhum alerta no momento'}
          accent={totalAlerts > 0}
          onPress={() => router.push(`/farms/${farmId}/funcionarios/funcionario/${employeeId}/documentos`)}
        />
        {gamification.totalDaysWorked > 0 ? (
          <View style={styles.gamificationCard}>
            <View style={styles.streakRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.streakValue}>
                  {gamification.currentStreakDays} {gamification.currentStreakDays === 1 ? 'dia seguido' : 'dias seguidos'}
                </Text>
                <Text style={styles.streakSubtitle}>
                  {gamification.currentStreakDays > 0
                    ? 'Batendo ponto todo dia — continue assim!'
                    : 'Sequência quebrada — bata o ponto hoje pra recomeçar.'}
                </Text>
              </View>
            </View>
            {gamification.badges.some((b) => b.achieved) ? (
              <View style={styles.badgesRow}>
                {gamification.badges
                  .filter((b) => b.achieved)
                  .map((b) => (
                    <View key={b.id} style={styles.badgeChip}>
                      <Text style={styles.badgeChipText}>
                        {b.emoji} {b.label}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <NavRow
          title="Ponto digital"
          subtitle={
            gamification.currentStreakDays > 0
              ? `🔥 ${gamification.currentStreakDays} dias seguidos — bater ponto e ver histórico`
              : 'Bater ponto e ver histórico'
          }
          onPress={() => router.push(`/farms/${farmId}/funcionarios/funcionario/${employeeId}/ponto`)}
        />
        <NavRow
          title="Produtividade"
          subtitle="Histórico de atividades realizadas"
          onPress={() => router.push(`/farms/${farmId}/funcionarios/funcionario/${employeeId}/produtividade`)}
        />
        <NavRow
          title="Mensagens"
          subtitle={employee.unreadMessageCount > 0 ? `${employee.unreadMessageCount} mensagem(ns) não lida(s)` : 'Converse com o funcionário'}
          accent={employee.unreadMessageCount > 0}
          onPress={() => router.push(`/farms/${farmId}/funcionarios/funcionario/${employeeId}/mensagens`)}
        />
      </View>
    </SafeAreaView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function NavRow({
  title,
  subtitle,
  accent,
  onPress,
}: {
  title: string;
  subtitle: string;
  accent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.navRowTitle}>{title}</Text>
        <Text style={[styles.navRowSubtitle, accent && { color: colors.danger }]}>{subtitle}</Text>
      </View>
      <Text style={styles.navRowChevron}>→</Text>
    </Pressable>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoCell: {
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoValue: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  navRowPressed: {
    opacity: 0.8,
  },
  navRowTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  navRowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  navRowChevron: {
    ...typography.heading,
    color: colors.funcionarios,
  },
  gamificationCard: {
    backgroundColor: colors.funcionariosLight,
    borderWidth: 1,
    borderColor: colors.funcionarios,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakValue: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  streakSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.funcionarios,
  },
  badgeChipText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
});
