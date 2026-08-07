import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { usePlots } from '../../../../src/hooks/usePlots';
import { colors, spacing } from '../../../../src/theme';

export default function NewPlotScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createPlot } = usePlots(farmId, 'lavoura');

  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const areaValue = Number(area.replace(',', '.'));
    if (!name.trim() || !areaValue || areaValue <= 0) {
      setError('Preencha o nome e uma área válida em hectares.');
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createPlot({ name: name.trim(), area_hectares: areaValue });
    setIsSubmitting(false);

    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Novo talhão" subtitle="Cadastro básico — a safra entra no próximo passo" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label="Nome do talhão" value={name} onChangeText={setName} placeholder="Ex.: Talhão 12" />
          <TextField
            label="Área (hectares)"
            value={area}
            onChangeText={setArea}
            placeholder="Ex.: 42.5"
            keyboardType="decimal-pad"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar talhão" onPress={handleSubmit} loading={isSubmitting} disabled={!name || !area} />
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
