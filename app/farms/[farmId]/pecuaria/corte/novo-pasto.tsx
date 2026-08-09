import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { usePlots } from '../../../../../src/hooks/usePlots';
import { useT } from '../../../../../src/i18n';
import { colors, spacing } from '../../../../../src/theme';

export default function NewPastureScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createPlot } = usePlots(farmId, 'pecuaria');
  const t = useT();

  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const areaValue = Number(area.replace(',', '.'));
    if (!name.trim() || !areaValue || areaValue <= 0) {
      setError(t('newPasture.validationError'));
      return;
    }
    const limitValue = limit.trim() ? Number(limit.replace(',', '.')) : undefined;

    setIsSubmitting(true);
    const { error: createError } = await createPlot({
      name: name.trim(),
      area_hectares: areaValue,
      max_stocking_rate_ua_ha: limitValue,
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
      <ScreenHeader title={t('newPasture.title')} subtitle={t('newPasture.subtitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label={t('newPasture.name')} value={name} onChangeText={setName} placeholder={t('newPasture.namePlaceholder')} />
          <TextField
            label={t('newPasture.area')}
            value={area}
            onChangeText={setArea}
            placeholder={t('newPasture.areaPlaceholder')}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t('newPasture.limit')}
            value={limit}
            onChangeText={setLimit}
            placeholder={t('newPasture.limitPlaceholder')}
            keyboardType="decimal-pad"
          />
          <Text style={styles.help}>{t('newPasture.limitHelp')}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newPasture.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!name || !area} />
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
  help: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  error: {
    color: colors.danger,
  },
});
