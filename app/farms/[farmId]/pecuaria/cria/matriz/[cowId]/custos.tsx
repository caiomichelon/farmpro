import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { BREEDING_COW_COST_CATEGORY_LABELS, useBreedingCowCosts } from '../../../../../../../src/hooks/useBreedingCowCosts';
import type { BreedingCowCost, BreedingCowCostCategory } from '../../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const CATEGORY_OPTIONS = Object.entries(BREEDING_COW_COST_CATEGORY_LABELS).map(([value, label]) => ({
  value: value as BreedingCowCostCategory,
  label,
}));

export default function BreedingCowCostsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cowId } = useLocalSearchParams<{ cowId: string }>();
  const { costs, totalCost, isLoading, error, createCost } = useBreedingCowCosts(cowId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Custos da matriz"
        subtitle={`Total: ${totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
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

function CostRow({ cost, styles }: { cost: BreedingCowCost; styles: ReturnType<typeof createStyles> }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardDescription}>{cost.description}</Text>
        <Text style={styles.cardValue}>
          {Number(cost.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>
      <View style={styles.cardMetaRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{BREEDING_COW_COST_CATEGORY_LABELS[cost.category]}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(cost.applied_at)}</Text>
      </View>
    </Card>
  );
}

function NewCostForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: { category: BreedingCowCostCategory; description: string; amount: number }) => Promise<string | null>;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [category, setCategory] = useState<BreedingCowCostCategory>('racao');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const amountValue = Number(amount.replace(',', '.'));
    if (!description.trim() || !amountValue || amountValue <= 0) {
      setError('Preencha a descrição e o valor.');
      return;
    }

    setIsSubmitting(true);
    const createError = await onCreate({ category, description: description.trim(), amount: amountValue });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <ChipSelect label="Categoria" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} accentColor={colors.pecuaria} />
      <TextField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Sal mineral" />
      <TextField label="Valor total" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="R$" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!description || !amount} style={{ flex: 1 }} />
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
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    categoryBadgeText: {
      ...typography.caption,
      color: colors.pecuaria,
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
