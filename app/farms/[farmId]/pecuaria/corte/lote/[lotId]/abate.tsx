import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { PhotoPicker } from '../../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { FAT_FINISH_SCORE_OPTIONS } from '../../../../../../../src/data/cattleOptions';
import { useCattleSlaughters } from '../../../../../../../src/hooks/useCattleSlaughters';
import { useSlaughterhouses } from '../../../../../../../src/hooks/useSlaughterhouses';
import { colors, spacing } from '../../../../../../../src/theme';

export default function SlaughterScreen() {
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { slaughterhouses, createSlaughterhouse } = useSlaughterhouses(farmId);
  const { createSlaughter } = useCattleSlaughters(lotId);

  const [slaughterhouseId, setSlaughterhouseId] = useState<string | null>(null);
  const [isAddingHouse, setIsAddingHouse] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [headCount, setHeadCount] = useState('');
  const [exitWeight, setExitWeight] = useState('');
  const [pricePerArroba, setPricePerArroba] = useState('');
  const [carcassYield, setCarcassYield] = useState('');
  const [fatFinish, setFatFinish] = useState<string | null>(null);
  const [feedConversion, setFeedConversion] = useState('');
  const [nextSlaughterDate, setNextSlaughterDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddHouse() {
    if (!newHouseName.trim()) return;
    const { error: createError } = await createSlaughterhouse({ name: newHouseName.trim() });
    if (createError) {
      setError(createError);
      return;
    }
    setNewHouseName('');
    setIsAddingHouse(false);
  }

  async function handleSubmit() {
    const headCountValue = Number(headCount);
    const exitWeightValue = Number(exitWeight.replace(',', '.'));
    const priceValue = Number(pricePerArroba.replace(',', '.'));
    if (!headCountValue || headCountValue <= 0 || !exitWeightValue || exitWeightValue <= 0 || !priceValue || priceValue <= 0) {
      setError('Preencha cabeças, peso de saída e preço por arroba.');
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createSlaughter({
      slaughterhouse_id: slaughterhouseId ?? undefined,
      head_count: headCountValue,
      exit_avg_weight_kg: exitWeightValue,
      price_per_arroba: priceValue,
      carcass_yield_pct: carcassYield ? Number(carcassYield.replace(',', '.')) : undefined,
      fat_finish_score: fatFinish ? Number(fatFinish) : undefined,
      feed_conversion_ratio: feedConversion ? Number(feedConversion.replace(',', '.')) : undefined,
      next_slaughter_date: parseDate(nextSlaughterDate) ?? undefined,
      photo_url: photoUrl ?? undefined,
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
      <ScreenHeader title="Registrar abate" subtitle="Indicadores de saída do lote" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect
            label="Frigorífico"
            options={slaughterhouses.map((s) => ({ value: s.id, label: s.name }))}
            value={slaughterhouseId}
            onChange={setSlaughterhouseId}
            accentColor={colors.pecuaria}
          />

          {isAddingHouse ? (
            <View style={styles.inlineRow}>
              <View style={{ flex: 1 }}>
                <TextField label="Novo frigorífico" value={newHouseName} onChangeText={setNewHouseName} placeholder="Nome do frigorífico" />
              </View>
              <Button label="Adicionar" onPress={handleAddHouse} disabled={!newHouseName.trim()} />
            </View>
          ) : (
            <Button label="+ Novo frigorífico" variant="ghost" onPress={() => setIsAddingHouse(true)} />
          )}

          <TextField label="Cabeças abatidas" value={headCount} onChangeText={setHeadCount} keyboardType="number-pad" placeholder="Ex.: 118" />
          <TextField label="Peso médio de saída (kg)" value={exitWeight} onChangeText={setExitWeight} keyboardType="decimal-pad" placeholder="Ex.: 540" />
          <TextField label="Preço pago por arroba" value={pricePerArroba} onChangeText={setPricePerArroba} keyboardType="decimal-pad" placeholder="R$" />
          <TextField label="Rendimento de carcaça (%)" value={carcassYield} onChangeText={setCarcassYield} keyboardType="decimal-pad" placeholder="Opcional — ex.: 54" />

          <ChipSelect
            label="Acabamento de gordura"
            options={FAT_FINISH_SCORE_OPTIONS}
            value={fatFinish}
            onChange={setFatFinish}
            accentColor={colors.pecuaria}
          />

          <TextField label="Conversão alimentar" value={feedConversion} onChangeText={setFeedConversion} keyboardType="decimal-pad" placeholder="Opcional — kg ração/kg ganho" />
          <TextField label="Próximo abate programado" value={nextSlaughterDate} onChangeText={setNextSlaughterDate} placeholder="DD/MM/AAAA (opcional)" keyboardType="numbers-and-punctuation" />
          <PhotoPicker
            label="Foto da nota (opcional)"
            photoUrl={photoUrl}
            onChange={setPhotoUrl}
            folder="cattle-slaughters"
            accentColor={colors.pecuaria}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Salvar abate"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!headCount || !exitWeight || !pricePerArroba}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
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
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
  },
});
