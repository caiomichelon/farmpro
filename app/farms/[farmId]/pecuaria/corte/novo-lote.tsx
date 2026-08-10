import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { FadeSlideIn } from '../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { usePlots } from '../../../../../src/hooks/usePlots';
import { useT } from '../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

export default function NewLotScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.entryCard}>
              <Text style={styles.cardTitle}>{t('newLot.entrySectionTitle')}</Text>
              <Text style={styles.cardSubtitle}>{t('newLot.entrySectionSubtitle')}</Text>
              <TextField label={t('newLot.name')} value={name} onChangeText={setName} placeholder={t('newLot.namePlaceholder')} />
              <TextField label={t('newLot.headCount')} value={headCount} onChangeText={setHeadCount} placeholder="Ex.: 120" keyboardType="number-pad" />
              <TextField label={t('newLot.avgWeight')} value={avgWeight} onChangeText={setAvgWeight} placeholder="Ex.: 380" keyboardType="decimal-pad" />
            </Card>
          </FadeSlideIn>

          <FadeSlideIn delay={90}>
            <Card style={styles.goalCard}>
              <Text style={styles.goalCardTitle}>{t('newLot.goalSectionTitle')}</Text>
              <TextField label={t('newLot.targetWeight')} value={targetWeight} onChangeText={setTargetWeight} placeholder={t('newLot.targetWeightPlaceholder')} keyboardType="decimal-pad" />
              {pastures.length > 0 ? (
                <ChipSelect
                  label={t('newLot.pastureLabel')}
                  options={[{ value: '', label: t('newLot.pastureNone') }, ...pastures.map((p) => ({ value: p.id, label: p.name }))]}
                  value={plotId ?? ''}
                  onChange={(value) => setPlotId(value || null)}
                  accentColor={colors.pecuaria}
                />
              ) : null}
            </Card>
          </FadeSlideIn>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newLot.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!name || !headCount || !avgWeight} />
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
    entryCard: {
      gap: spacing.md,
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.pecuaria,
    },
    cardSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
    },
    goalCard: {
      gap: spacing.md,
      backgroundColor: colors.surface,
    },
    goalCardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    error: { color: colors.danger },
  });
}
