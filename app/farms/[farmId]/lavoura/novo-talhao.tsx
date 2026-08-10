import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { FadeSlideIn } from '../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { usePlots } from '../../../../src/hooks/usePlots';
import { useT } from '../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

export default function NewPlotScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('newPlot.title')}</Text>
              <TextField label={t('newPlot.name')} value={name} onChangeText={setName} placeholder={t('newPlot.namePlaceholder')} />
              <TextField
                label={t('newPlot.area')}
                value={area}
                onChangeText={setArea}
                placeholder={t('newPlot.areaPlaceholder')}
                keyboardType="decimal-pad"
              />
            </Card>
          </FadeSlideIn>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newPlot.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!name || !area} />
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
      backgroundColor: colors.lavouraLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.lavoura,
    },
    error: { color: colors.danger },
  });
}
