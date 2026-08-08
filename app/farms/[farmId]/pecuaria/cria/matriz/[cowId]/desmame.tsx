import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useWeanings } from '../../../../../../../src/hooks/useWeanings';
import { spacing, useColors, type Colors } from '../../../../../../../src/theme';

export default function NewWeaningScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { calvingId } = useLocalSearchParams<{ calvingId: string }>();
  const { createWeaning } = useWeanings(calvingId);

  const [weaningDate, setWeaningDate] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const { error: createError } = await createWeaning({
      weaning_date: parseDate(weaningDate) ?? undefined,
      weight_kg: weight ? Number(weight.replace(',', '.')) : undefined,
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
      <ScreenHeader title="Registrar desmame" subtitle="Peso e data em que o(s) bezerro(s) saíram da mãe" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <TextField
            label="Data do desmame"
            value={weaningDate}
            onChangeText={setWeaningDate}
            placeholder="DD/MM/AAAA (hoje, se vazio)"
            keyboardType="numbers-and-punctuation"
          />
          <TextField label="Peso ao desmame (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Opcional — ex.: 180" />
          <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar desmame" onPress={handleSubmit} loading={isSubmitting} />
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
