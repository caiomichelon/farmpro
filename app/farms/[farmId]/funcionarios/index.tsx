import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { ChipSelect } from '../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { EMPLOYEE_SECTOR_LABELS, EMPLOYEE_SECTOR_OPTIONS } from '../../../../src/data/employeeOptions';
import { useEmployees, type EmployeeSummary } from '../../../../src/hooks/useEmployees';
import { useT, type TFunction } from '../../../../src/i18n';
import type { EmployeeSector } from '../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

export default function EmployeesHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const [sectorFilter, setSectorFilter] = useState<EmployeeSector | null>(null);
  const { employees, isLoading, error, reload } = useEmployees(farmId, sectorFilter ?? undefined);
  const t = useT();

  // "Novo funcionário" é uma rota separada — sem isso, o funcionário recém
  // cadastrado só apareceria depois de um refresh manual desta tela.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const totalAlerts = employees.reduce((sum, e) => sum + e.expiredDocumentCount + e.expiringSoonDocumentCount, 0);
  const totalUnread = employees.reduce((sum, e) => sum + e.unreadMessageCount, 0);
  const subtitleParts = [`${employees.length} ${employees.length === 1 ? t('employeesHome.singular') : t('employeesHome.plural')}`];
  if (totalAlerts > 0)
    subtitleParts.push(`${totalAlerts} ${totalAlerts === 1 ? t('employeesHome.documentAlertSingular') : t('employeesHome.documentAlertPlural')}`);
  if (totalUnread > 0)
    subtitleParts.push(`${totalUnread} ${totalUnread === 1 ? t('employeesHome.unreadSingular') : t('employeesHome.unreadPlural')}`);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('employeesHome.title')}
        subtitle={subtitleParts.join(' · ')}
        right={
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push(`/farms/${farmId}/funcionarios/planilha`)} hitSlop={12}>
              <Text style={styles.headerLink}>{t('employeesHome.sheet')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/farms/${farmId}/funcionarios/importar`)} hitSlop={12}>
              <Text style={styles.headerLink}>{t('employeesHome.import')}</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.filterRow}>
        <ChipSelect
          label={t('employeesHome.sectorFilter')}
          options={[
            { value: '__all__', label: t('employeesHome.allSectors') },
            ...EMPLOYEE_SECTOR_OPTIONS.map((s) => ({ value: s, label: EMPLOYEE_SECTOR_LABELS[s] })),
          ]}
          value={sectorFilter ?? '__all__'}
          onChange={(v) => setSectorFilter(v === '__all__' ? null : (v as EmployeeSector))}
          accentColor={colors.funcionarios}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text={t('employeesHome.empty')} />}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={Math.min(index, 6) * 50}>
              <EmployeeCard
                employee={item}
                onPress={() => router.push(`/farms/${farmId}/funcionarios/funcionario/${item.id}`)}
                t={t}
                styles={styles}
              />
            </FadeSlideIn>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button
          label={t('employeesHome.newEmployee')}
          onPress={() => router.push(`/farms/${farmId}/funcionarios/novo-funcionario`)}
        />
      </View>
    </SafeAreaView>
  );
}

function EmployeeCard({
  employee,
  onPress,
  t,
  styles,
}: {
  employee: EmployeeSummary;
  onPress: () => void;
  t: TFunction;
  styles: ReturnType<typeof createStyles>;
}) {
  const hasAlert = employee.expiredDocumentCount > 0 || employee.expiringSoonDocumentCount > 0;
  const hasUnread = employee.unreadMessageCount > 0;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{employee.full_name}</Text>
          <Text style={styles.cardSubtitle}>{employee.role}</Text>
        </View>
        <View style={styles.badgeStack}>
          {hasAlert ? (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>
                {employee.expiredDocumentCount > 0 ? t('employeesHome.docExpired') : t('employeesHome.docExpiringSoon')}
              </Text>
            </View>
          ) : null}
          {hasUnread ? (
            <View style={styles.messageBadge}>
              <Text style={styles.messageBadgeText}>
                {employee.unreadMessageCount} {employee.unreadMessageCount === 1 ? t('employeesHome.messageSingular') : t('employeesHome.messagePlural')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.cardBottomRow}>
        <View style={styles.sectorBadge}>
          <Text style={styles.sectorBadgeText}>{EMPLOYEE_SECTOR_LABELS[employee.sector]}</Text>
        </View>
        {employee.currentStreakDays >= 3 ? (
          <Text style={styles.streakText}>
            🔥 {employee.currentStreakDays} {employee.currentStreakDays === 1 ? t('employeesHome.daySingular') : t('employeesHome.dayPlural')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
  headerLinks: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerLink: {
    ...typography.captionMedium,
    color: colors.funcionarios,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeStack: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  alertBadge: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  alertBadgeText: {
    ...typography.caption,
    color: colors.danger,
  },
  messageBadge: {
    backgroundColor: colors.funcionariosLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  messageBadgeText: {
    ...typography.caption,
    color: colors.funcionarios,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.funcionariosLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  sectorBadgeText: {
    ...typography.captionMedium,
    color: colors.funcionarios,
  },
  streakText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  });
}
