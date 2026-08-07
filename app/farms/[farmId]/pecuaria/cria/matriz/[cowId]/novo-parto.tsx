import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useCalvings } from '../../../../../../../src/hooks/useCalvings';
import { useInseminations } from '../../../../../../../src/hooks/useInseminations';
import { colors, spacing } from '../../../../../../../src/theme';

export default function NewCalvingScreen() {
  const { cowId } = useLocalSearchParams<{ cowId: string }>();
  const { inseminations } = useInseminations(cowId);
  const { calvings, createCalving } = useCalvings(cowId);

  const [calvingDate, setCalvingDate] = useState('');
  const [calfCount, setCalfCount] = useState('1');
  const [calfIdentification, setCalfIdentification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vincula automaticamente à inseminação em aberto mais recente (se houver).
  const openInsemination = inseminations.find((i) => !calvings.some((c) => c.insemination_id === i.id));

  async function handleSubmit() {
    const count = Number(calfCount) || 1;
    setIsSubmitting(true);
    const { error: createError } = await createCalving({
      insemination_id: openInsemination?.id,
      calving_date: parseDate(calvingDate) ?? undefined,
      calf_count: count,
      calf_identification: calfIdentification.trim() || undefined,
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
      <ScreenHeader title="Registrar parto" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField
            label="Data do parto"
            value={calvingDate}
            onChangeText={setCalvingDate}
            placeholder="DD/MM/AAAA (hoje, se vazio)"
            keyboardType="numbers-and-punctuation"
          />
          <TextField label="Quantidade de bezerros" value={calfCount} onChangeText={setCalfCount} keyboardType="number-pad" />
          <TextField
            label="Identificação do(s) bezerro(s)"
            value={calfIdentification}
            onChangeText={setCalfIdentification}
            placeholder="Opcional"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar parto" onPress={handleSubmit} loading={isSubmitting} />
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

const styles = StyleSheet.create({
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
