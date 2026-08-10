import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../../src/components/Button';
import { Card } from '../../../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../../../src/components/ChipSelect';
import { FadeSlideIn } from '../../../../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../../src/components/TextField';
import { useCattleAnimals } from '../../../../../../../../src/hooks/useCattleAnimals';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../../src/theme';
import type { CattleAnimalSex } from '../../../../../../../../src/types/database';

const SEX_OPTIONS: { value: CattleAnimalSex; label: string }[] = [
  { value: 'macho', label: 'Macho' },
  { value: 'femea', label: 'Fêmea' },
];

export default function NewAnimalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { createAnimal } = useCattleAnimals(lotId);

  const [tagNumber, setTagNumber] = useState('');
  const [officialIdNumber, setOfficialIdNumber] = useState('');
  const [sex, setSex] = useState<CattleAnimalSex | null>(null);
  const [breed, setBreed] = useState('');
  const [entryWeight, setEntryWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!tagNumber.trim()) {
      setError('Informe o número do brinco.');
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createAnimal({
      farm_id: farmId,
      tag_number: tagNumber.trim(),
      official_id_number: officialIdNumber.trim() || undefined,
      sex: sex ?? undefined,
      breed: breed.trim() || undefined,
      entry_weight_kg: entryWeight ? Number(entryWeight.replace(',', '.')) : undefined,
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
      <ScreenHeader title="Novo animal" subtitle="Cadastro individual" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.idCard}>
              <Text style={styles.cardTitle}>Identificação</Text>
              <TextField label="Brinco / identificação" value={tagNumber} onChangeText={setTagNumber} placeholder="Ex.: 4521" />
              <TextField
                label="Número oficial de rastreamento (opcional)"
                value={officialIdNumber}
                onChangeText={setOfficialIdNumber}
                placeholder="SISBOV, SIAP/SENACSA — se tiver"
              />
              <Text style={styles.cardHelp}>Rastreabilidade oficial do animal — diferente do brinco de manejo do dia a dia.</Text>
            </Card>
          </FadeSlideIn>

          <FadeSlideIn delay={90}>
            <Card style={styles.detailsCard}>
              <Text style={styles.detailsCardTitle}>Características</Text>
              <ChipSelect label="Sexo" options={SEX_OPTIONS} value={sex} onChange={setSex} accentColor={colors.pecuaria} />
              <TextField label="Raça" value={breed} onChangeText={setBreed} placeholder="Opcional — ex.: Nelore" />
              <TextField
                label="Peso de entrada (kg)"
                value={entryWeight}
                onChangeText={setEntryWeight}
                placeholder="Opcional"
                keyboardType="decimal-pad"
              />
            </Card>
          </FadeSlideIn>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar animal" onPress={handleSubmit} loading={isSubmitting} disabled={!tagNumber} />
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
    idCard: {
      gap: spacing.md,
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.pecuaria,
    },
    cardHelp: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    detailsCard: {
      gap: spacing.md,
      backgroundColor: colors.surface,
    },
    detailsCardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    error: { color: colors.danger },
  });
}
