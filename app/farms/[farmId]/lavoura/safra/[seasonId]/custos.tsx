import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { PRODUCTION_COST_CATEGORY_LABELS, useProductionCosts } from '../../../../../../src/hooks/useProductionCosts';
import type { ProductionCost, ProductionCostCategory } from '../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

const CATEGORY_OPTIONS = Object.entries(PRODUCTION_COST_CATEGORY_LABELS).map(([value, label]) => ({
  value: value as ProductionCostCategory,
  label,
}));

export default function ProductionCostsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  const { costs, totalCost, isLoading, error, createCost } = useProductionCosts(seasonId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Custo de produção"
        subtitle={`Total: ${totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : (
        <FlatList
          data={costs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="Nenhum custo lançado ainda." />}
          renderItem={({ item }) => <CostRow cost={item} styles={styles} />}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        {isAdding ? (
          <NewCostForm
            styles={styles}
            onCancel={() => setIsAdding(false)}
            onCreate={async (values) => {
              const { error: createError } = await createCost(values);
              if (!createError) setIsAdding(false);
              return createError;
            }}
          />
        ) : (
          <Button label="+ Lançar custo" onPress={() => setIsAdding(true)} />
        )}
      </View>
    </SafeAreaView>
  );
}

function CostRow({ cost, styles }: { cost: ProductionCost; styles: ReturnType<typeof createStyles> }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardDescription}>{cost.description}</Text>
        <Text style={styles.cardValue}>
          {Number(cost.total_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>
      <View style={styles.cardMetaRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{PRODUCTION_COST_CATEGORY_LABELS[cost.category]}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(cost.applied_at)}</Text>
        {cost.quantity && cost.unit ? (
          <Text style={styles.cardDate}>
            {cost.quantity} {cost.unit}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function NewCostForm({
  onCancel,
  onCreate,
  styles,
}: {
  onCancel: () => void;
  onCreate: (values: {
    category: ProductionCostCategory;
    description: string;
    quantity?: number;
    unit?: string;
    unit_cost?: number;
    total_cost: number;
  }) => Promise<string | null>;
  styles: ReturnType<typeof createStyles>;
}) {
  const colors = useColors();
  const [category, setCategory] = useState<ProductionCostCategory>('semente');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quantityValue = Number(quantity.replace(',', '.')) || undefined;
  const unitCostValue = Number(unitCost.replace(',', '.')) || undefined;
  const computedTotal = quantityValue && unitCostValue ? quantityValue * unitCostValue : undefined;
  const effectiveTotal = totalCost ? Number(totalCost.replace(',', '.')) : computedTotal;

  async function handleSubmit() {
    if (!description.trim() || !effectiveTotal || effectiveTotal <= 0) {
      setError('Preencha a descrição e o valor total (ou quantidade + custo unitário).');
      return;
    }

    setIsSubmitting(true);
    const createError = await onCreate({
      category,
      description: description.trim(),
      quantity: quantityValue,
      unit: unit.trim() || undefined,
      unit_cost: unitCostValue,
      total_cost: effectiveTotal,
    });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <ChipSelect label="Categoria" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} accentColor={colors.lavoura} />
      <TextField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Adubo NPK 20-05-20" />
      <View style={styles.formRow}>
        <View style={{ flex: 1 }}>
          <TextField label="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Opcional" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Unidade" value={unit} onChangeText={setUnit} placeholder="kg, L, sc..." />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={{ flex: 1 }}>
          <TextField label="Custo unitário" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" placeholder="Opcional" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Valor total"
            value={totalCost}
            onChangeText={setTotalCost}
            keyboardType="decimal-pad"
            placeholder={computedTotal ? computedTotal.toFixed(2) : 'R$'}
          />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!description} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
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
    gap: spacing.md,
  },
  cardDescription: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  cardValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.lavouraLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    ...typography.caption,
    color: colors.lavoura,
  },
  cardDate: {
    ...typography.caption,
    color: colors.textMuted,
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
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
  },
  });
}
