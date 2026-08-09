import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useBreedingCows } from '../../../../../src/hooks/useBreedingCows';
import { useT } from '../../../../../src/i18n';
import { spacing, useColors, type Colors } from '../../../../../src/theme';

const NO_DAM = '__nenhuma__';

export default function NewCowScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, createCow } = useBreedingCows(farmId);
  const t = useT();

  const [identification, setIdentification] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [damId, setDamId] = useState<string>(NO_DAM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const damOptions = [{ value: NO_DAM, label: t('newCow.noDam') }, ...cows.map((c) => ({ value: c.id, label: c.identification }))];

  async function handleSubmit() {
    if (!identification.trim()) {
      setError(t('newCow.validationError'));
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createCow({
      identification: identification.trim(),
      birth_date: parseDate(birthDate) ?? undefined,
      dam_id: damId === NO_DAM ? undefined : damId,
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
      <ScreenHeader title={t('newCow.title')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField
            label={t('newCow.identification')}
            value={identification}
            onChangeText={setIdentification}
            placeholder={t('newCow.identificationPlaceholder')}
          />
          <TextField
            label={t('newCow.birthDate')}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder={t('newCow.birthDatePlaceholder')}
            keyboardType="numbers-and-punctuation"
          />
          {cows.length > 0 ? (
            <ChipSelect label={t('newCow.dam')} options={damOptions} value={damId} onChange={setDamId} accentColor={colors.pecuaria} />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newCow.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!identification} />
        </View>
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

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
}
