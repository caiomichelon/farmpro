import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useCattleActivityGroups } from '../../../../../src/hooks/useCattleActivityGroups';
import { useT } from '../../../../../src/i18n';
import { spacing, useColors, type Colors } from '../../../../../src/theme';

const SUGGESTIONS = ['Pasto', 'Suplementação proteica', 'Curral'];

export default function NewCattleSectorScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createGroup } = useCattleActivityGroups(farmId);

  const [sectorName, setSectorName] = useState('');
  const [headCount, setHeadCount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const headCountValue = Number(headCount);
    if (!sectorName.trim()) {
      setError(t('newCattleSector.errorName'));
      return;
    }
    if (!headCountValue || headCountValue <= 0) {
      setError(t('newCattleSector.errorHeadCount'));
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createGroup({
      sector_name: sectorName,
      head_count: headCountValue,
      notes: notes || undefined,
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
      <ScreenHeader title={t('newCattleSector.title')} subtitle={t('newCattleSector.subtitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>
            <ChipSelect
              label={t('newCattleSector.suggestionsLabel')}
              options={SUGGESTIONS.map((s) => ({ value: s, label: s }))}
              value={sectorName}
              onChange={setSectorName}
              accentColor={colors.pecuaria}
            />
            <TextField
              label={t('newCattleSector.nameLabel')}
              value={sectorName}
              onChangeText={setSectorName}
              placeholder={t('newCattleSector.namePlaceholder')}
            />
            <TextField
              label={t('newCattleSector.headCountLabel')}
              value={headCount}
              onChangeText={setHeadCount}
              keyboardType="number-pad"
              placeholder="Ex.: 40"
            />
            <TextField
              label={t('newCattleSector.notesLabel')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('newCattleSector.notesPlaceholder')}
            />
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newCattleSector.save')} onPress={handleSubmit} loading={isSubmitting} />
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
      backgroundColor: colors.surface,
    },
    error: {
      color: colors.danger,
    },
  });
}
