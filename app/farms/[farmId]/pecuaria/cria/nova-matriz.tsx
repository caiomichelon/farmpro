import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useBreedingCows } from '../../../../../src/hooks/useBreedingCows';
import { spacing, useColors, type Colors } from '../../../../../src/theme';

const NO_DAM = '__nenhuma__';

export default function NewCowScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, createCow } = useBreedingCows(farmId);

  const [identification, setIdentification] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [damId, setDamId] = useState<string>(NO_DAM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const damOptions = [{ value: NO_DAM, label: 'Nenhuma / não sei' }, ...cows.map((c) => ({ value: c.id, label: c.identification }))];

  async function handleSubmit() {
    if (!identification.trim()) {
      setError('Informe a identificação da matriz (brinco ou nome).');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createCow({
      identification: identification.trim(),
      birth_date: parseDate(birthDate) ?? undefined,
      dam_id: damId === NO_DAM ? undefined : damId,
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
      <ScreenHeader title="Nova matriz" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField
            label="Identificação"
            value={identification}
            onChangeText={setIdentification}
            placeholder="Ex.: Brinco 452"
          />
          <TextField
            label="Data de nascimento"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="DD/MM/AAAA (opcional)"
            keyboardType="numbers-and-punctuation"
          />
          {cows.length > 0 ? (
            <ChipSelect label="Mãe (opcional)" options={damOptions} value={damId} onChange={setDamId} accentColor={colors.pecuaria} />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar matriz" onPress={handleSubmit} loading={isSubmitting} disabled={!identification} />
        </View>
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
      gap: spacing.lg,
    },
    error: {
      color: colors.danger,
    },
  });
}
