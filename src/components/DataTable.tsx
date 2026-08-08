import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { findChartableColumns, parseNumericCell } from '../lib/chartData';
import { exportRowsToXlsx } from '../lib/tableExport';
import { radius, spacing, typography, useColors, type Colors } from '../theme';
import { ChipSelect } from './ChipSelect';
import { SimpleChart, type ChartType } from './SimpleChart';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  width: number;
  render: (row: T) => string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  /** Nome da planilha — vira o título da aba do Excel exportado e o título
   * do gráfico. Sem isso usa "Planilha". */
  title?: string;
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'barras', label: 'Barras' },
  { value: 'linha', label: 'Linha' },
  { value: 'pizza', label: 'Pizza' },
];

/** Tabela/planilha com rolagem horizontal — para listas com várias colunas
 * de informação (ex.: todos os animais ou todas as matrizes de uma vez).
 * Traz de fábrica um botão pra exportar pra Excel e outro pra gerar um
 * gráfico a partir de qualquer coluna numérica, sem cada tela precisar
 * implementar isso na mão. */
export function DataTable<T>({ columns, data, keyExtractor, onRowPress, title }: DataTableProps<T>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tableTitle = title ?? 'Planilha';

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('barras');
  const [chartColumnKey, setChartColumnKey] = useState<string | null>(null);

  const chartableColumns = useMemo(() => findChartableColumns(columns, data), [columns, data]);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      const headers = columns.map((c) => c.label);
      const rows = data.map((row) => columns.map((col) => col.render(row)));
      await exportRowsToXlsx(tableTitle, headers, rows);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Não foi possível gerar a planilha.');
    } finally {
      setIsExporting(false);
    }
  }

  function handleToggleChart() {
    if (!chartOpen && !chartColumnKey && chartableColumns.length > 0) {
      setChartColumnKey(chartableColumns[0].key);
    }
    setChartOpen((v) => !v);
  }

  const selectedColumn = columns.find((c) => c.key === chartColumnKey);
  const labelColumn = columns[0];
  const chartData =
    selectedColumn && labelColumn
      ? data
          .map((row) => ({ label: labelColumn.render(row), value: parseNumericCell(selectedColumn.render(row)) }))
          .filter((d): d is { label: string; value: number } => d.value !== null)
      : [];

  return (
    <View style={styles.wrapper}>
      <View style={styles.toolbar}>
        <Pressable style={({ pressed }) => [styles.toolbarButton, pressed && styles.toolbarButtonPressed]} onPress={handleExport} disabled={isExporting || data.length === 0}>
          {isExporting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.toolbarButtonText}>⇩ Exportar</Text>}
        </Pressable>
        {chartableColumns.length > 0 ? (
          <Pressable style={({ pressed }) => [styles.toolbarButton, pressed && styles.toolbarButtonPressed]} onPress={handleToggleChart}>
            <Text style={styles.toolbarButtonText}>{chartOpen ? '✕ Fechar gráfico' : '📊 Gráfico'}</Text>
          </Pressable>
        ) : null}
      </View>

      {exportError ? <Text style={styles.errorText}>{exportError}</Text> : null}

      {chartOpen && chartableColumns.length > 0 ? (
        <View style={styles.chartPanel}>
          <ChipSelect
            label="Coluna"
            options={chartableColumns.map((c) => ({ value: c.key, label: c.label }))}
            value={chartColumnKey}
            onChange={setChartColumnKey}
            accentColor={colors.primary}
          />
          <ChipSelect label="Tipo de gráfico" options={CHART_TYPE_OPTIONS} value={chartType} onChange={setChartType} accentColor={colors.primary} />
          <SimpleChart type={chartType} data={chartData} color={colors.primary} />
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.outer}>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((col) => (
              <View key={col.key} style={[styles.cell, { width: col.width }]}>
                <Text style={styles.headerText}>{col.label}</Text>
              </View>
            ))}
          </View>

          {data.map((row) => {
            const key = keyExtractor(row);
            const rowContent = (
              <View style={[styles.row, styles.dataRow]}>
                {columns.map((col) => (
                  <View key={col.key} style={[styles.cell, { width: col.width }]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {col.render(row)}
                    </Text>
                  </View>
                ))}
              </View>
            );

            if (!onRowPress) {
              return <View key={key}>{rowContent}</View>;
            }

            return (
              <Pressable key={key} onPress={() => onRowPress(row)} style={({ pressed }) => pressed && styles.rowPressed}>
                {rowContent}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    toolbarButton: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    toolbarButtonPressed: {
      opacity: 0.7,
    },
    toolbarButtonText: {
      ...typography.captionMedium,
      color: colors.textPrimary,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
    chartPanel: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    outer: {
      flexGrow: 0,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      backgroundColor: colors.surfaceAlt,
    },
    dataRow: {
      backgroundColor: colors.surface,
    },
    rowPressed: {
      opacity: 0.7,
    },
    cell: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      justifyContent: 'center',
    },
    headerText: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    cellText: {
      ...typography.captionMedium,
      color: colors.textPrimary,
    },
  });
}
