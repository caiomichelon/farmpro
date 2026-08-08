import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { colors, spacing } from '../../../../../src/theme';

export default function NewLotScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createLot } = useCattleLots(farmId);

  const [name, setName] = useState('');
  const [headCount, setHeadCount] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const headCountValue = Number(headCount);
    const avgWeightValue = Number(avgWeight.replace(',', '.'));
    const targetWeightValue = targetWeight ? Number(targetWeight.replace(',', '.')) : undefined;
    if (!name.trim() || !headCountValue || headCountValue <= 0 || !avgWeightValue || avgWeightValue <= 0) {
      setError('Preencha o nome, o número de cabeças e o peso médio de entrada.');
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createLot({
      name: name.trim(),
      entry_head_count: headCountValue,
      entry_avg_weight_kg: avgWeightValue,
      target_slaughter_weight_kg: targetWeightValue,
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
      <ScreenHeader title="Novo lote" subtitle="Dados de entrada do lote" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label="Nome do lote" value={name} onChangeText={setName} placeholder="Ex.: Lote 3 — Confinamento" />
          <TextField
            label="Cabeças na entrada"
            value={headCount}
            onChangeText={setHeadCount}
            placeholder="Ex.: 120"
            keyboardType="number-pad"
          />
          <TextField
            label="Peso médio de entrada (kg)"
            value={avgWeight}
            onChangeText={setAvgWeight}
            placeholder="Ex.: 380"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Meta de peso pra abate (kg)"
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder="Opcional — ex.: 540. Sem isso, não dá pra saber quando o lote fica pronto"
            keyboardType="decimal-pad"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Salvar lote"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!name || !headCount || !avgWeight}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
