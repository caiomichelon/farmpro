import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { usePlots } from '../../../../src/hooks/usePlots';
import { useT } from '../../../../src/i18n';
import { colors, spacing } from '../../../../src/theme';

export default function NewPlotScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createPlot } = usePlots(farmId, 'lavoura');
  const t = useT();

  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const areaValue = Number(area.replace(',', '.'));
    if (!name.trim() || !areaValue || areaValue <= 0) {
      setError(t('newPlot.validationError'));
      return;
    }

    setIsSubmitting(true);
    const { error: createError, id } = await createPlot({ name: name.trim(), area_hectares: areaValue });
    setIsSubmitting(false);

    if (createError || !id) {
      setError(createError ?? t('newPlot.validationError'));
      return;
    }
    // Um talhão sozinho ainda não basta pra lançar colheita — segue direto
    // pro cadastro da safra, em vez de voltar pra lista e deixar a pessoa
    // procurar o próximo passo sozinha.
    router.replace(`/farms/${farmId}/lavoura/talhao/${id}/nova-safra`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('newPlot.title')} subtitle={t('newPlot.subtitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label={t('newPlot.name')} value={name} onChangeText={setName} placeholder={t('newPlot.namePlaceholder')} />
          <TextField
            label={t('newPlot.area')}
            value={area}
            onChangeText={setArea}
            placeholder={t('newPlot.areaPlaceholder')}
            keyboardType="decimal-pad"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newPlot.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!name || !area} />
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
