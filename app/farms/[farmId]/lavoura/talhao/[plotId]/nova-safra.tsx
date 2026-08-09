import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { COMMON_CROPS } from '../../../../../../src/data/seasonStatus';
import { usePlot } from '../../../../../../src/hooks/usePlots';
import { usePlotSeasons } from '../../../../../../src/hooks/usePlotSeasons';
import { colors, spacing } from '../../../../../../src/theme';

function defaultSeasonLabel() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}

export default function NewSeasonScreen() {
  const { farmId, plotId } = useLocalSearchParams<{ farmId: string; plotId: string }>();
  const { plot } = usePlot(plotId);
  const { createSeason } = usePlotSeasons(plotId);

  const [crop, setCrop] = useState('');
  const [variety, setVariety] = useState('');
  const [seasonLabel, setSeasonLabel] = useState(defaultSeasonLabel());
  const [plantedArea, setPlantedArea] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pré-preenche a área plantada com a área total do talhão na primeira vez.
  useEffect(() => {
    if (plot && !plantedArea) {
      setPlantedArea(String(plot.area_hectares));
    }
  }, [plot]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    const areaValue = Number(plantedArea.replace(',', '.'));
    if (!crop.trim() || !seasonLabel.trim() || !areaValue || areaValue <= 0) {
      setError('Preencha a cultura, a safra e uma área plantada válida.');
      return;
    }

    setIsSubmitting(true);
    const { error: createError, id } = await createSeason({
      crop: crop.trim(),
      variety: variety.trim() || undefined,
      season_label: seasonLabel.trim(),
      planted_area_hectares: areaValue,
      planting_date: parseDate(plantingDate) ?? undefined,
    });
    setIsSubmitting(false);

    if (createError || !id) {
      setError(createError ?? 'Não foi possível salvar a safra.');
      return;
    }
    // Vai direto pro hub da safra — de lá "Colheita e venda" já é um toque,
    // em vez de voltar pra lista e a pessoa ter que reabrir o talhão de novo.
    router.replace(`/farms/${farmId}/lavoura/safra/${id}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Nova safra" subtitle={plot?.name} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect
            label="Cultura"
            options={COMMON_CROPS.map((c) => ({ value: c, label: c }))}
            value={COMMON_CROPS.includes(crop) ? crop : null}
            onChange={setCrop}
            accentColor={colors.lavoura}
          />
          <TextField label="Cultura (ou digite outra)" value={crop} onChangeText={setCrop} placeholder="Ex.: Soja" />
          <TextField
            label="Variedade da semente"
            value={variety}
            onChangeText={setVariety}
            placeholder="Opcional — ex.: TMG 7062"
          />
          <TextField label="Safra" value={seasonLabel} onChangeText={setSeasonLabel} placeholder="Ex.: 2025/2026" />
          <TextField
            label="Área plantada (hectares)"
            value={plantedArea}
            onChangeText={setPlantedArea}
            keyboardType="decimal-pad"
          />
          <TextField
            label="Data de plantio"
            value={plantingDate}
            onChangeText={setPlantingDate}
            placeholder="DD/MM/AAAA (opcional)"
            keyboardType="numbers-and-punctuation"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Salvar safra"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!crop || !seasonLabel || !plantedArea}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Converte "DD/MM/AAAA" em "AAAA-MM-DD" (formato de data do Postgres). */
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
  error: {
    color: colors.danger,
  },
});
