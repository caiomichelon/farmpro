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
import { INSEMINATION_METHODS } from '../../../../../../../src/data/cattleOptions';
import { estimateCalvingDate, useInseminations } from '../../../../../../../src/hooks/useInseminations';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

export default function NewInseminationScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cowId } = useLocalSearchParams<{ cowId: string }>();
  const { createInsemination } = useInseminations(cowId);

  const [inseminationDate, setInseminationDate] = useState('');
  const [veterinarian, setVeterinarian] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [sireOrSemen, setSireOrSemen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isoDate = useMemo(() => parseDate(inseminationDate) ?? new Date().toISOString().slice(0, 10), [inseminationDate]);
  const estimatedCalving = estimateCalvingDate(isoDate);

  async function handleSubmit() {
    setIsSubmitting(true);
    const { error: createError } = await createInsemination({
      insemination_date: parseDate(inseminationDate) ?? undefined,
      veterinarian: veterinarian.trim() || undefined,
      method: method ?? undefined,
      sire_or_semen: sireOrSemen.trim() || undefined,
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
      <ScreenHeader title="Nova inseminação" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Inseminação</Text>
              <TextField
                label="Data da inseminação"
                value={inseminationDate}
                onChangeText={setInseminationDate}
                placeholder="DD/MM/AAAA (hoje, se vazio)"
                keyboardType="numbers-and-punctuation"
              />
              <ChipSelect
                label="Método"
                options={INSEMINATION_METHODS.map((m) => ({ value: m, label: m }))}
                value={method}
                onChange={setMethod}
                accentColor={colors.pecuaria}
              />
              <TextField label="Veterinário responsável" value={veterinarian} onChangeText={setVeterinarian} placeholder="Opcional" />
              <TextField label="Touro / sêmen utilizado" value={sireOrSemen} onChangeText={setSireOrSemen} placeholder="Opcional" />

              <Text style={styles.preview}>Previsão de parto (gestação média de 283 dias): {formatDate(estimatedCalving)}</Text>
            </Card>
          </FadeSlideIn>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar inseminação" onPress={handleSubmit} loading={isSubmitting} />
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

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
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
    preview: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    error: {
      color: colors.danger,
    },
  });
}
