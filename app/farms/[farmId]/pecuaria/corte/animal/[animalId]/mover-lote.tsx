import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { FadeSlideIn } from '../../../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useCattleAnimal } from '../../../../../../../src/hooks/useCattleAnimals';
import { useCattleAnimalMovements } from '../../../../../../../src/hooks/useCattleAnimalMovements';
import { useCattleLots } from '../../../../../../../src/hooks/useCattleLots';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

export default function MoveAnimalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, animalId } = useLocalSearchParams<{ farmId: string; animalId: string }>();
  const { animal } = useCattleAnimal(animalId);
  const { lots } = useCattleLots(farmId);
  const { moveToLot } = useCattleAnimalMovements(animalId);

  const [toLotId, setToLotId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableLots = lots.filter((l) => l.id !== animal?.lot_id);

  async function handleSubmit() {
    if (!toLotId || !animal) {
      setError('Escolha o lote de destino.');
      return;
    }
    setIsSubmitting(true);
    const { error: moveError } = await moveToLot({
      from_lot_id: animal.lot_id,
      to_lot_id: toLotId,
      notes: notes.trim() || undefined,
    });
    setIsSubmitting(false);
    if (moveError) {
      setError(moveError);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Mover de lote" subtitle={animal ? `Atualmente em: ${animal.lotName ?? '—'}` : undefined} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Destino</Text>
              <ChipSelect
                label="Novo lote"
                options={availableLots.map((l) => ({ value: l.id, label: l.name }))}
                value={toLotId}
                onChange={setToLotId}
                accentColor={colors.pecuaria}
              />
              <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
            </Card>
          </FadeSlideIn>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Confirmar movimentação" onPress={handleSubmit} loading={isSubmitting} disabled={!toLotId} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    card: {
      gap: spacing.md,
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.pecuaria,
    },
    error: { color: colors.danger },
  });
}
