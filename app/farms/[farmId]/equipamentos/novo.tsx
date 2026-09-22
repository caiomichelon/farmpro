import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { ChipSelect } from '../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { EQUIPMENT_TYPE_SUGGESTIONS } from '../../../../src/data/equipmentOptions';
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
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!type.trim()) {
      setError(t('equipment.errorType'));
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createEquipment({ name, type, notes: notes || undefined });
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
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect
            label={t('equipment.typeSuggestionsLabel')}
            options={EQUIPMENT_TYPE_SUGGESTIONS.map((s) => ({ value: s, label: s }))}
            value={type}
            onChange={setType}
            accentColor={colors.primary}
          />
          <TextField label={t('equipment.typeLabel')} value={type} onChangeText={setType} placeholder={t('equipment.typePlaceholder')} />
          <TextField label={t('equipment.nameLabel')} value={name} onChangeText={setName} placeholder={t('equipment.namePlaceholder')} />
          <TextField label={t('equipment.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('equipment.optionalPlaceholder')} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('equipment.saveButton')} onPress={handleSubmit} loading={isSubmitting} disabled={!name || !type} />
        </ScrollView>
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
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    error: {
      color: colors.danger,
    },
  });
}
