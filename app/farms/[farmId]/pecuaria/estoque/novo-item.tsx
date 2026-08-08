import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { CATTLE_INVENTORY_CATEGORY_OPTIONS, CATTLE_INVENTORY_UNIT_OPTIONS } from '../../../../../src/data/cattleOptions';
import { useCattleInventoryItems } from '../../../../../src/hooks/useCattleInventory';
import type { CattleInventoryCategory, CattleInventoryUnit } from '../../../../../src/types/database';
import { spacing, useColors, type Colors } from '../../../../../src/theme';

export default function NewInventoryItemScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createItem } = useCattleInventoryItems(farmId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<CattleInventoryCategory>('racao');
  const [unit, setUnit] = useState<CattleInventoryUnit>('kg');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Informe o nome do item.');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createItem({
      name: name.trim(),
      category,
      unit,
      initial_quantity: initialQuantity ? Number(initialQuantity.replace(',', '.')) : undefined,
      min_quantity: minQuantity ? Number(minQuantity.replace(',', '.')) : undefined,
      unit_cost: unitCost ? Number(unitCost.replace(',', '.')) : undefined,
    });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Novo item de estoque" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Ração 20% PB" />
          <ChipSelect label="Categoria" options={CATTLE_INVENTORY_CATEGORY_OPTIONS} value={category} onChange={setCategory} accentColor={colors.pecuaria} />
          <ChipSelect label="Unidade" options={CATTLE_INVENTORY_UNIT_OPTIONS} value={unit} onChange={setUnit} accentColor={colors.pecuaria} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Estoque inicial" value={initialQuantity} onChangeText={setInitialQuantity} placeholder="Ex.: 500" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Estoque mínimo" value={minQuantity} onChangeText={setMinQuantity} placeholder="Opcional" keyboardType="decimal-pad" />
            </View>
          </View>
          <TextField label="Custo por unidade (R$)" value={unitCost} onChangeText={setUnitCost} placeholder="Opcional" keyboardType="decimal-pad" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar item" onPress={handleSubmit} loading={isSubmitting} disabled={!name} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    form: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    error: {
      color: colors.danger,
    },
  });
}
