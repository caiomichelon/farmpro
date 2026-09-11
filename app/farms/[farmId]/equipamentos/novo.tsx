import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { useEquipment } from '../../../../src/hooks/useEquipment';
import { useT } from '../../../../src/i18n';
import { spacing, useColors, type Colors } from '../../../../src/theme';

export default function NewEquipmentScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
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
      <ScreenHeader title={t('equipment.newTitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label={t('equipment.nameLabel')} value={name} onChangeText={setName} placeholder={t('equipment.namePlaceholder')} />
          <TextField label={t('equipment.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('equipment.optionalPlaceholder')} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('equipment.saveButton')} onPress={handleSubmit} loading={isSubmitting} disabled={!name} />
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
