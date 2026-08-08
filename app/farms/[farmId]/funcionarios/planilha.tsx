import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../src/components/DataTable';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { EMPLOYEE_COST_TYPE_LABELS, EMPLOYEE_SECTOR_LABELS } from '../../../../src/data/employeeOptions';
import { useEmployees, type EmployeeSummary } from '../../../../src/hooks/useEmployees';
import { spacing, typography, useColors, type Colors } from '../../../../src/theme';

const STATUS_LABELS: Record<string, string> = { ativo: 'Ativo', inativo: 'Inativo' };

function buildColumns(): DataTableColumn<EmployeeSummary>[] {
  return [
    { key: 'name', label: 'Nome', width: 160, render: (e) => e.full_name },
    { key: 'role', label: 'Cargo', width: 140, render: (e) => e.role },
    { key: 'sector', label: 'Setor', width: 120, render: (e) => EMPLOYEE_SECTOR_LABELS[e.sector] },
    { key: 'status', label: 'Status', width: 90, render: (e) => STATUS_LABELS[e.status] },
    { key: 'costType', label: 'Tipo de custo', width: 120, render: (e) => EMPLOYEE_COST_TYPE_LABELS[e.cost_type] },
    { key: 'costValue', label: 'Valor', width: 120, render: (e) => Number(e.cost_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    { key: 'admission', label: 'Admissão', width: 110, render: (e) => formatDate(e.admission_date) },
    { key: 'docs', label: 'Docs vencidos', width: 110, render: (e) => String(e.expiredDocumentCount) },
  ];
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Planilha com todos os funcionários da fazenda de uma vez — mesmo padrão
 * das planilhas de Lavoura/Corte/Cria, com exportar e gráfico de fábrica. */
export default function EmployeesSpreadsheetScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildColumns(), []);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { employees, isLoading, error, reload } = useEmployees(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Todos os funcionários"
        subtitle={`${employees.length} ${employees.length === 1 ? 'funcionário' : 'funcionários'} · arraste para o lado pra ver mais colunas`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      ) : employees.length === 0 ? (
        <EmptyState text="Nenhum funcionário cadastrado ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <DataTable
            title="Funcionários"
            columns={columns}
            data={employees}
            keyExtractor={(e) => e.id}
            onRowPress={(e) => router.push(`/farms/${farmId}/funcionarios/funcionario/${e.id}`)}
          />
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
