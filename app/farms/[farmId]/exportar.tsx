import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useFarm } from '../../../src/hooks/useFarms';
import { exportFarmData, type ExportProgress } from '../../../src/lib/spreadsheetExport';
import { colors, spacing, typography } from '../../../src/theme';

type Status = 'idle' | 'exporting' | 'done' | 'error';

export default function ExportFarmDataScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm } = useFarm(farmId);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<{ sheetCount: number; rowCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!farmId) return;
    setStatus('exporting');
    setError(null);
    try {
      const res = await exportFarmData(farmId, farm?.name ?? 'Fazenda', setProgress);
      setResult(res);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar a planilha.');
      setStatus('error');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Exportar dados" subtitle="Tudo da Lavoura, Pecuária e Funcionários" />

      <View style={styles.content}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>O que vai na planilha</Text>
          <Text style={styles.infoText}>
            Um arquivo Excel (.xlsx) com uma aba pra cada tipo de dado: talhões, safras, custos, colheitas, vendas
            e compradores de grão (Lavoura); lotes, animais, pesagens, saúde, movimentação, mortalidade, abates e
            frigoríficos (Corte); matrizes, inseminações e partos (Cria); e funcionários, documentos, ponto e
            produtividade.
          </Text>
        </Card>

        {status === 'exporting' ? (
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Gerando planilha…</Text>
            {progress ? (
              <Text style={styles.infoText}>
                {progress.done} de {progress.total} abas
                {progress.sheetName ? ` — ${progress.sheetName}` : ''}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {status === 'done' && result ? (
          <Card style={styles.successCard}>
            <Text style={styles.infoTitle}>Planilha gerada</Text>
            <Text style={styles.infoText}>
              {result.sheetCount} abas, {result.rowCount} registro(s) no total.
            </Text>
          </Card>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={status === 'done' ? 'Exportar de novo' : 'Exportar tudo (.xlsx)'}
          onPress={handleExport}
          loading={status === 'exporting'}
        />

        <Pressable
          style={({ pressed }) => [styles.reportRow, pressed && styles.reportRowPressed]}
          onPress={() => router.push(`/farms/${farmId}/relatorio-bancario`)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Relatório para banco (PDF)</Text>
            <Text style={styles.reportSubtitle}>Resumo pronto pra apresentar em financiamento — não é o dump de dados</Text>
          </View>
          <Text style={styles.reportChevron}>→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  infoCard: {
    gap: spacing.xs,
  },
  successCard: {
    gap: spacing.xs,
    borderColor: colors.successLight,
    backgroundColor: colors.successLight,
  },
  infoTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginTop: spacing.sm,
  },
  reportRowPressed: {
    opacity: 0.8,
  },
  reportTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  reportSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reportChevron: {
    ...typography.heading,
    color: colors.primary,
  },
});
