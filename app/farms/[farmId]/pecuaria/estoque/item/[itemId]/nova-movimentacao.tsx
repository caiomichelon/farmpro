import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useCattleInventoryItem, useCattleInventoryMovements } from '../../../../../../../src/hooks/useCattleInventory';
import { useCattleLots } from '../../../../../../../src/hooks/useCattleLots';
import type { CattleInventoryMovementType } from '../../../../../../../src/types/database';
import { spacing, useColors, type Colors } from '../../../../../../../src/theme';

const TYPE_OPTIONS: { value: CattleInventoryMovementType; label: string }[] = [
  { value: 'entrada', label: 'Entrada (compra)' },
  { value: 'saida', label: 'Saída (consumo)' },
];

export default function NewInventoryMovementScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, itemId, type: initialType } = useLocalSearchParams<{ farmId: string; itemId: string; type?: string }>();
  const { item } = useCattleInventoryItem(itemId);
  const { createMovement } = useCattleInventoryMovements(itemId);
  const { lots } = useCattleLots(farmId);

  const [type, setType] = useState<CattleInventoryMovementType>(initialType === 'saida' ? 'saida' : 'entrada');
  const [quantity, setQuantity] = useState('');
  const [lotId, setLotId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLots = lots.filter((l) => l.status === 'ativo');

  async function handleSubmit() {
    const quantityValue = Number(quantity.replace(',', '.'));
    if (!quantityValue || quantityValue <= 0) {
      setError('Informe uma quantidade válida.');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createMovement({
      type,
      quantity: quantityValue,
      lot_id: lotId ?? undefined,
      notes: notes.trim() || undefined,
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
      <ScreenHeader title="Nova movimentação" subtitle={item?.name} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect label="Tipo" options={TYPE_OPTIONS} value={type} onChange={setType} accentColor={colors.pecuaria} />
          <TextField label="Quantidade" value={quantity} onChangeText={setQuantity} placeholder="Ex.: 50" keyboardType="decimal-pad" />
          {type === 'saida' && activeLots.length > 0 ? (
            <ChipSelect
              label="Lote (opcional)"
              options={activeLots.map((l) => ({ value: l.id, label: l.name }))}
              value={lotId}
              onChange={setLotId}
              accentColor={colors.pecuaria}
            />
          ) : null}
          <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar movimentação" onPress={handleSubmit} loading={isSubmitting} disabled={!quantity} />
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
    error: {
      color: colors.danger,
    },
  });
}
