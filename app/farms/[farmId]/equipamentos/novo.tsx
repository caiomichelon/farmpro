import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { useEquipment } from '../../../../src/hooks/useEquipment';
import { spacing, useColors, type Colors } from '../../../../src/theme';

export default function NewEquipmentScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createEquipment } = useEquipment(farmId);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const { error: createError } = await createEquipment({ name, notes: notes || undefined });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Novo equipamento" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Trator Massey 4x2" />
          <TextField label="Observações" value={notes} onChangeText={setNotes} placeholder="Opcional" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar equipamento" onPress={handleSubmit} loading={isSubmitting} disabled={!name} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
