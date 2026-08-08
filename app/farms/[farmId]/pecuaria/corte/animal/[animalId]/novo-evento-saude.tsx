import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { HEALTH_EVENT_TYPE_LABELS, useCattleAnimalHealthEvents } from '../../../../../../../src/hooks/useCattleAnimalHealth';
import type { CattleHealthEventType } from '../../../../../../../src/types/database';
import { spacing, useColors, type Colors } from '../../../../../../../src/theme';

const EVENT_TYPE_OPTIONS = Object.entries(HEALTH_EVENT_TYPE_LABELS).map(([value, label]) => ({
  value: value as CattleHealthEventType,
  label,
}));

export default function NewHealthEventScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  const { createEvent } = useCattleAnimalHealthEvents(animalId);

  const [eventType, setEventType] = useState<CattleHealthEventType>('vacina');
  const [description, setDescription] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) {
      setError('Descreva o evento (ex.: nome da vacina ou tratamento).');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createEvent({
      event_type: eventType,
      description: description.trim(),
      next_due_date: parseDate(nextDueDate) ?? undefined,
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
      <ScreenHeader title="Registrar evento de saúde" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect label="Tipo" options={EVENT_TYPE_OPTIONS} value={eventType} onChange={setEventType} accentColor={colors.pecuaria} />
          <TextField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Vacina febre aftosa" />
          <TextField
            label="Próxima dose/retorno"
            value={nextDueDate}
            onChangeText={setNextDueDate}
            placeholder="DD/MM/AAAA (opcional)"
            keyboardType="numbers-and-punctuation"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!description} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
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
