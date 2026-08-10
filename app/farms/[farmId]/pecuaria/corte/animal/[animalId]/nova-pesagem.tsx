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
import { BODY_CONDITION_SCORE_OPTIONS } from '../../../../../../../src/data/cattleOptions';
import { useCattleAnimalWeighings } from '../../../../../../../src/hooks/useCattleAnimalWeighings';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

export default function NewAnimalWeighingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  const { createWeighing } = useCattleAnimalWeighings(animalId);

  const [weight, setWeight] = useState('');
  const [bodyScore, setBodyScore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const weightValue = Number(weight.replace(',', '.'));
    if (!weightValue || weightValue <= 0) {
      setError('Informe um peso válido.');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createWeighing({
      weight_kg: weightValue,
      body_condition_score: bodyScore ? Number(bodyScore) : undefined,
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
      <ScreenHeader title="Nova pesagem" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Pesagem</Text>
              <TextField label="Peso (kg)" value={weight} onChangeText={setWeight} placeholder="Ex.: 430" keyboardType="decimal-pad" />
              <ChipSelect
                label="Escore de condição corporal"
                options={BODY_CONDITION_SCORE_OPTIONS}
                value={bodyScore}
                onChange={setBodyScore}
                accentColor={colors.pecuaria}
              />
            </Card>
          </FadeSlideIn>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar pesagem" onPress={handleSubmit} loading={isSubmitting} disabled={!weight} />
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
