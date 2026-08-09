import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { usePlots } from '../../../../../src/hooks/usePlots';
import { useT } from '../../../../../src/i18n';
import { colors, spacing } from '../../../../../src/theme';

export default function NewLotScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createLot } = useCattleLots(farmId);
  const { plots: pastures } = usePlots(farmId, 'pecuaria');
  const t = useT();

  const [name, setName] = useState('');
  const [headCount, setHeadCount] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [plotId, setPlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const headCountValue = Number(headCount);
    const avgWeightValue = Number(avgWeight.replace(',', '.'));
    const targetWeightValue = targetWeight ? Number(targetWeight.replace(',', '.')) : undefined;
    if (!name.trim() || !headCountValue || headCountValue <= 0 || !avgWeightValue || avgWeightValue <= 0) {
      setError(t('newLot.validationError'));
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createLot({
      name: name.trim(),
      entry_head_count: headCountValue,
      entry_avg_weight_kg: avgWeightValue,
      target_slaughter_weight_kg: targetWeightValue,
      plot_id: plotId ?? undefined,
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
      <ScreenHeader title={t('newLot.title')} subtitle={t('newLot.subtitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label={t('newLot.name')} value={name} onChangeText={setName} placeholder={t('newLot.namePlaceholder')} />
          <TextField
            label={t('newLot.headCount')}
            value={headCount}
            onChangeText={setHeadCount}
            placeholder="Ex.: 120"
            keyboardType="number-pad"
          />
          <TextField
            label={t('newLot.avgWeight')}
            value={avgWeight}
            onChangeText={setAvgWeight}
            placeholder="Ex.: 380"
            keyboardType="decimal-pad"
          />
          <TextField
            label={t('newLot.targetWeight')}
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder={t('newLot.targetWeightPlaceholder')}
            keyboardType="decimal-pad"
          />
          {pastures.length > 0 ? (
            <ChipSelect
              label={t('newLot.pastureLabel')}
              options={[{ value: '', label: t('newLot.pastureNone') }, ...pastures.map((p) => ({ value: p.id, label: p.name }))]}
              value={plotId ?? ''}
              onChange={(value) => setPlotId(value || null)}
              accentColor={colors.pecuaria}
            />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={t('newLot.save')}
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
