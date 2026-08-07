import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { ChipSelect } from '../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { EMPLOYEE_SECTOR_LABELS, EMPLOYEE_SECTOR_OPTIONS } from '../../../../src/data/employeeOptions';
import { useEmployees, type EmployeeSummary } from '../../../../src/hooks/useEmployees';
import type { EmployeeSector } from '../../../../src/types/database';
import { colors, radius, spacing, typography } from '../../../../src/theme';

export default function EmployeesHomeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const [sectorFilter, setSectorFilter] = useState<EmployeeSector | null>(null);
  const { employees, isLoading, error } = useEmployees(farmId, sectorFilter ?? undefined);

  const totalAlerts = employees.reduce((sum, e) => sum + e.expiredDocumentCount + e.expiringSoonDocumentCount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Funcionários"
        subtitle={
          totalAlerts > 0
            ? `${employees.length} ${employees.length === 1 ? 'funcionário' : 'funcionários'} · ${totalAlerts} ${totalAlerts === 1 ? 'alerta de documento' : 'alertas de documento'}`
            : `${employees.length} ${employees.length === 1 ? 'funcionário' : 'funcionários'}`
        }
      />

      <View style={styles.filterRow}>
        <ChipSelect
          label="Setor"
          options={[
            { value: '__all__', label: 'Todos' },
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
          ListEmptyComponent={<EmptyState text="Nenhum funcionário cadastrado ainda." />}
          renderItem={({ item }) => (
            <EmployeeCard
              employee={item}
              onPress={() => router.push(`/farms/${farmId}/funcionarios/funcionario/${item.id}`)}
            />
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button
          label="+ Novo funcionário"
          onPress={() => router.push(`/farms/${farmId}/funcionarios/novo-funcionario`)}
        />
      </View>
    </SafeAreaView>
  );
}

function EmployeeCard({ employee, onPress }: { employee: EmployeeSummary; onPress: () => void }) {
  const hasAlert = employee.expiredDocumentCount > 0 || employee.expiringSoonDocumentCount > 0;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{employee.full_name}</Text>
          <Text style={styles.cardSubtitle}>{employee.role}</Text>
        </View>
        {hasAlert ? (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>
              {employee.expiredDocumentCount > 0 ? 'Doc. vencido' : 'Doc. vence em breve'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.sectorBadge}>
        <Text style={styles.sectorBadgeText}>{EMPLOYEE_SECTOR_LABELS[employee.sector]}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
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
  sectorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.funcionariosLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.sm,
  },
  sectorBadgeText: {
    ...typography.captionMedium,
    color: colors.funcionarios,
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
