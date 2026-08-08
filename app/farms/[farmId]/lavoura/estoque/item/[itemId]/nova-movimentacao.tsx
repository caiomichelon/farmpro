import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useLavouraInventoryItem, useLavouraInventoryMovements } from '../../../../../../../src/hooks/useLavouraInventory';
import { useSeasonsByFarm } from '../../../../../../../src/hooks/usePlotSeasons';
import type { LavouraInventoryMovementType } from '../../../../../../../src/types/database';
import { spacing, useColors, type Colors } from '../../../../../../../src/theme';

const TYPE_OPTIONS: { value: LavouraInventoryMovementType; label: string }[] = [
  { value: 'entrada', label: 'Entrada (compra)' },
  { value: 'saida', label: 'Saída (aplicação)' },
];

export default function NewLavouraInventoryMovementScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, itemId, type: initialType } = useLocalSearchParams<{ farmId: string; itemId: string; type?: string }>();
  const { item } = useLavouraInventoryItem(itemId);
  const { createMovement } = useLavouraInventoryMovements(itemId);
  const { seasons } = useSeasonsByFarm(farmId);

  const [type, setType] = useState<LavouraInventoryMovementType>(initialType === 'saida' ? 'saida' : 'entrada');
  const [quantity, setQuantity] = useState('');
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      plot_season_id: seasonId ?? undefined,
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
          <ChipSelect label="Tipo" options={TYPE_OPTIONS} value={type} onChange={setType} accentColor={colors.lavoura} />
          <TextField label="Quantidade" value={quantity} onChangeText={setQuantity} placeholder="Ex.: 50" keyboardType="decimal-pad" />
          {type === 'saida' && seasons.length > 0 ? (
            <ChipSelect
              label="Safra (opcional)"
              options={seasons.map((s) => ({ value: s.id, label: `${s.plotName} — ${s.season_label}` }))}
              value={seasonId}
              onChange={setSeasonId}
              accentColor={colors.lavoura}
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
