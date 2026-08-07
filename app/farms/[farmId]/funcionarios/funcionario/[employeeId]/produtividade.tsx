import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { COMMON_PRODUCTIVITY_UNITS } from '../../../../../../src/data/employeeOptions';
import { useProductivityRecords } from '../../../../../../src/hooks/useProductivityRecords';
import type { ProductivityRecord } from '../../../../../../src/types/database';
import { colors, spacing, typography } from '../../../../../../src/theme';

export default function ProductivityScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { records, isLoading, error, createRecord } = useProductivityRecords(employeeId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Produtividade" subtitle="Histórico de atividades" />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="Nenhum registro de produtividade ainda." />}
          renderItem={({ item }) => <RecordRow record={item} />}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        {isAdding ? (
          <NewRecordForm
            onCancel={() => setIsAdding(false)}
            onCreate={async (values) => {
              const { error: createError } = await createRecord(values);
              if (!createError) setIsAdding(false);
              return createError;
            }}
          />
        ) : (
          <Button label="+ Lançar atividade" onPress={() => setIsAdding(true)} />
        )}
      </View>
    </SafeAreaView>
  );
}

function RecordRow({ record }: { record: ProductivityRecord }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{record.activity}</Text>
        <Text style={styles.cardDate}>{formatDate(record.record_date)}</Text>
      </View>
      <Text style={styles.cardMeta}>
        {Number(record.quantity).toLocaleString('pt-BR')} {record.unit}
      </Text>
    </Card>
  );
}

function NewRecordForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: { activity: string; quantity: number; unit: string }) => Promise<string | null>;
}) {
  const [activity, setActivity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const quantityValue = Number(quantity.replace(',', '.'));
    if (!activity.trim() || !quantityValue || quantityValue <= 0 || !unit.trim()) {
      setError('Preencha a atividade, a quantidade e a unidade.');
      return;
    }
    setIsSubmitting(true);
    const createError = await onCreate({ activity: activity.trim(), quantity: quantityValue, unit: unit.trim() });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <TextField label="Atividade" value={activity} onChangeText={setActivity} placeholder="Ex.: Pulverização, manejo de curral" />
      <View style={styles.formRow}>
        <View style={{ flex: 1 }}>
          <TextField label="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Ex.: 12" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Unidade" value={unit} onChangeText={setUnit} placeholder="Ex.: hectares" />
        </View>
      </View>
      <ChipSelect
        label="Unidades comuns"
        options={COMMON_PRODUCTIVITY_UNITS.map((u) => ({ value: u, label: u }))}
        value={COMMON_PRODUCTIVITY_UNITS.includes(unit) ? unit : null}
        onChange={setUnit}
        accentColor={colors.funcionarios}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!activity || !quantity || !unit} style={{ flex: 1 }} />
      </View>
    </View>
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
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  cardDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cardMeta: {
    ...typography.captionMedium,
    color: colors.funcionarios,
    marginTop: 2,
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
  form: {
    gap: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
  },
});
