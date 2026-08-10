import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { FadeSlideIn } from '../../../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useCattleMortalityEvents } from '../../../../../../../src/hooks/useCattleMortality';
import { useT } from '../../../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

export default function MortalityScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { createEvent } = useCattleMortalityEvents(lotId);
  const t = useT();

  const [headCount, setHeadCount] = useState('');
  const [cause, setCause] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const value = Number(headCount);
    if (!value || value <= 0) {
      setError(t('mortality.validationError'));
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createEvent({ head_count: value, cause: cause.trim() || undefined });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('mortality.title')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('mortality.sectionTitle')}</Text>
              <TextField
                label={t('mortality.headCount')}
                value={headCount}
                onChangeText={setHeadCount}
                placeholder="Ex.: 2"
                keyboardType="number-pad"
              />
              <TextField label={t('mortality.cause')} value={cause} onChangeText={setCause} placeholder={t('mortality.optional')} />
            </Card>
          </FadeSlideIn>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('mortality.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!headCount} />
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
      backgroundColor: colors.dangerLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    error: { color: colors.danger },
  });
}
