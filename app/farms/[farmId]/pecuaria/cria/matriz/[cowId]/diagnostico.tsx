import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useInseminations } from '../../../../../../../src/hooks/useInseminations';
import {
  DIAGNOSIS_METHODS,
  PREGNANCY_DIAGNOSIS_RESULT_LABELS,
  usePregnancyDiagnoses,
} from '../../../../../../../src/hooks/usePregnancyDiagnoses';
import type { PregnancyDiagnosisResult } from '../../../../../../../src/types/database';
import { spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const RESULT_OPTIONS = Object.entries(PREGNANCY_DIAGNOSIS_RESULT_LABELS).map(([value, label]) => ({
  value: value as PregnancyDiagnosisResult,
  label,
}));

export default function NewDiagnosisScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cowId } = useLocalSearchParams<{ cowId: string }>();
  const { inseminations, isLoading: isLoadingInseminations } = useInseminations(cowId);
  const lastInsemination = inseminations[0];
  const { createDiagnosis } = usePregnancyDiagnoses(lastInsemination?.id);

  const [result, setResult] = useState<PregnancyDiagnosisResult | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!result) {
      setError('Escolha o resultado do diagnóstico.');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createDiagnosis({ result, method: method ?? undefined });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  if (isLoadingInseminations) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  if (!lastInsemination) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="Diagnóstico de gestação" />
        <Text style={styles.emptyText}>Essa matriz ainda não tem nenhuma inseminação registrada.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Diagnóstico de gestação" subtitle={`Inseminação de ${formatDate(lastInsemination.insemination_date)}`} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect label="Resultado" options={RESULT_OPTIONS} value={result} onChange={setResult} accentColor={colors.pecuaria} />
          <ChipSelect
            label="Método"
            options={DIAGNOSIS_METHODS.map((m) => ({ value: m, label: m }))}
            value={method}
            onChange={setMethod}
            accentColor={colors.pecuaria}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar diagnóstico" onPress={handleSubmit} loading={isSubmitting} disabled={!result} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    flex: {
      flex: 1,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      paddingHorizontal: spacing.xl,
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
