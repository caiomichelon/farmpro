import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

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
}

/** Tabela/planilha com rolagem horizontal — para listas com várias colunas
 * de informação (ex.: todos os animais ou todas as matrizes de uma vez). */
export function DataTable<T>({ columns, data, keyExtractor, onRowPress }: DataTableProps<T>) {
  return (
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
  );
}

const styles = StyleSheet.create({
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
