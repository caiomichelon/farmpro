import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { ChipSelect } from '../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import { COMMON_CROPS } from '../../../../src/data/seasonStatus';
import { useQuickHarvestStart } from '../../../../src/hooks/useQuickHarvestStart';
import { useT } from '../../../../src/i18n';
import { spacing, useColors, type Colors } from '../../../../src/theme';

/** Atalho pra quem quer só lançar colheita e ainda não tem nenhum talhão —
 * pede o mínimo possível (cultura + área) e cria talhão e safra nos
 * bastidores, sem expor essa distinção. Quem quiser organizar por vários
 * talhões formalmente ainda pode, pelos cadastros normais. */
export default function HarvestQuickStartScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { start } = useQuickHarvestStart(farmId);

  const [crop, setCrop] = useState('');
  const [area, setArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const areaValue = Number(area.replace(',', '.'));
    if (!crop.trim() || !areaValue || areaValue <= 0) {
      setError(t('harvestStart.validationError'));
      return;
    }

    setIsSubmitting(true);
    const { error: startError, seasonId } = await start({ crop: crop.trim(), area_hectares: areaValue });
    setIsSubmitting(false);

    if (startError || !seasonId) {
      setError(startError ?? t('harvestStart.validationError'));
      return;
    }
    router.replace(`/farms/${farmId}/lavoura/safra/${seasonId}/colheita`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('harvestStart.title')} subtitle={t('harvestStart.subtitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <ChipSelect
            label={t('harvestStart.cropLabel')}
            options={COMMON_CROPS.map((c) => ({ value: c, label: c }))}
            value={COMMON_CROPS.includes(crop) ? crop : null}
            onChange={setCrop}
            accentColor={colors.lavoura}
          />
          <TextField label={t('harvestStart.cropLabel')} value={crop} onChangeText={setCrop} placeholder={t('harvestStart.cropPlaceholder')} />
          <TextField
            label={t('harvestStart.areaLabel')}
            value={area}
            onChangeText={setArea}
            placeholder={t('harvestStart.areaPlaceholder')}
            keyboardType="decimal-pad"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('harvestStart.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!crop || !area} />
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
