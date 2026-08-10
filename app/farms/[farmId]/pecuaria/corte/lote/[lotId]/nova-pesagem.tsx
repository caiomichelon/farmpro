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
import { useCattleLotWeighings } from '../../../../../../../src/hooks/useCattleLotWeighings';
import { useT } from '../../../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

export default function NewWeighingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('newWeighing.sectionTitle')}</Text>
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
            </Card>
          </FadeSlideIn>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newWeighing.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!avgWeight} />
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
