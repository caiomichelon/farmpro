import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { useCattleMortalityEvents } from '../../../../../../../src/hooks/useCattleMortality';
import { colors, spacing } from '../../../../../../../src/theme';

export default function MortalityScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { createEvent } = useCattleMortalityEvents(lotId);

  const [headCount, setHeadCount] = useState('');
  const [cause, setCause] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const value = Number(headCount);
    if (!value || value <= 0) {
      setError('Informe quantas cabeças foram perdidas.');
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
      <ScreenHeader title="Registrar mortalidade" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField
            label="Cabeças perdidas"
            value={headCount}
            onChangeText={setHeadCount}
            placeholder="Ex.: 2"
            keyboardType="number-pad"
          />
          <TextField label="Causa" value={cause} onChangeText={setCause} placeholder="Opcional" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!headCount} />
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
