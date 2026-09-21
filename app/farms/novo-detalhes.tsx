import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { FadeSlideIn } from '../../src/components/FadeSlideIn';
import { TextField } from '../../src/components/TextField';
import { useFarms } from '../../src/hooks/useFarms';
import { useT, type TranslationKey } from '../../src/i18n';
import type { FarmSectorType } from '../../src/types/database';
import { spacing, typography, useColors, type Colors } from '../../src/theme';

const TYPE_KEY: Record<FarmSectorType, TranslationKey> = {
  lavoura: 'farms.sectorTypeLavoura',
  pecuaria: 'farms.sectorTypePecuaria',
  ambos: 'farms.sectorTypeAmbos',
};

/** Segunda tela do fluxo de criar fazenda — nome/cidade/UF, com o tipo já
 * escolhido na tela anterior (app/farms/novo-tipo.tsx) vindo por parâmetro
 * de rota. Sem seletor de tipo aqui: essa escolha já foi feita. */
export default function NewFarmDetailsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { sectorType: rawSectorType } = useLocalSearchParams<{ sectorType?: string }>();
  // Defesa contra acesso direto a essa tela sem passar pela anterior (link
  // externo, tela recarregada, etc.) — sem um tipo válido, manda de volta
  // pra escolher em vez de deixar salvar uma fazenda com tipo errado.
  const sectorType: FarmSectorType | null =
    rawSectorType === 'lavoura' || rawSectorType === 'pecuaria' || rawSectorType === 'ambos' ? rawSectorType : null;
  const { createFarm } = useFarms();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!sectorType) return;
    setError(null);
    setIsSubmitting(true);
    const { error: createError } = await createFarm({ name: name.trim(), sectorType, city: city.trim(), state: state.trim() });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    router.replace('/farms');
  }

  if (!sectorType) {
    return <Redirect href="/farms/novo-tipo" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FadeSlideIn>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backLink}>{t('common.back')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('newFarmDetails.title')}</Text>
          <Text style={styles.subtitle}>{t('newFarmDetails.subtitle', { type: t(TYPE_KEY[sectorType]) })}</Text>
        </View>
      </FadeSlideIn>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <TextField label={t('farms.newFarmName')} value={name} onChangeText={setName} placeholder={t('farms.newFarmNamePlaceholder')} />
          <View style={styles.formRow}>
            <View style={{ flex: 2 }}>
              <TextField label={t('farms.city')} value={city} onChangeText={setCity} placeholder={t('farms.optional')} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('farms.state')}
                value={state}
                onChangeText={setState}
                placeholder={t('farms.optional')}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button label={t('farms.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!name} />
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
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      gap: spacing.xs,
    },
    backLink: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
    },
    title: {
      ...typography.displayMd,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    form: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    formRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
