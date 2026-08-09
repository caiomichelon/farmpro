import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { BODY_CONDITION_SCORE_OPTIONS } from '../../../../../../../src/data/cattleOptions';
import { useCattleLotWeighings } from '../../../../../../../src/hooks/useCattleLotWeighings';
import { useT } from '../../../../../../../src/i18n';
import { colors, spacing } from '../../../../../../../src/theme';

export default function NewWeighingScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { createWeighing } = useCattleLotWeighings(lotId);
  const t = useT();

  const [avgWeight, setAvgWeight] = useState('');
  const [bodyScore, setBodyScore] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const weightValue = Number(avgWeight.replace(',', '.'));
    if (!weightValue || weightValue <= 0) {
      setError(t('newWeighing.validationError'));
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createWeighing({
      avg_weight_kg: weightValue,
      body_condition_score: bodyScore ? Number(bodyScore) : undefined,
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
      <ScreenHeader title={t('newWeighing.title')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <TextField
            label={t('newWeighing.avgWeight')}
            value={avgWeight}
            onChangeText={setAvgWeight}
            placeholder="Ex.: 420"
            keyboardType="decimal-pad"
          />
          <ChipSelect
            label={t('newWeighing.bodyScore')}
            options={BODY_CONDITION_SCORE_OPTIONS}
            value={bodyScore}
            onChange={setBodyScore}
            accentColor={colors.pecuaria}
          />
          <TextField label={t('newWeighing.notes')} value={notes} onChangeText={setNotes} placeholder={t('mortality.optional')} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newWeighing.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!avgWeight} />
        </ScrollView>
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
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  error: {
    color: colors.danger,
  },
});
