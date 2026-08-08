import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { HEALTH_EVENT_TYPE_LABELS, useCattleAnimalHealthEvents } from '../../../../../../../src/hooks/useCattleAnimalHealth';
import { useCattleHealthProtocols } from '../../../../../../../src/hooks/useCattleHealthProtocols';
import type { CattleHealthEventType } from '../../../../../../../src/types/database';
import { radius, spacing, useColors, type Colors } from '../../../../../../../src/theme';

const EVENT_TYPE_OPTIONS = Object.entries(HEALTH_EVENT_TYPE_LABELS).map(([value, label]) => ({
  value: value as CattleHealthEventType,
  label,
}));

function formatDateBR(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function NewHealthEventScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, animalId } = useLocalSearchParams<{ farmId: string; animalId: string }>();
  const { createEvent } = useCattleAnimalHealthEvents(animalId);
  const { protocols } = useCattleHealthProtocols(farmId);

  const [eventType, setEventType] = useState<CattleHealthEventType>('vacina');
  const [description, setDescription] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const protocolOptions = protocols.map((p) => ({ value: p.id, label: p.name }));

  function applyProtocol(id: string) {
    setProtocolId(id);
    const protocol = protocols.find((p) => p.id === id);
    if (!protocol) return;
    setEventType(protocol.event_type);
    if (!description.trim()) setDescription(protocol.name);
    const due = new Date();
    due.setDate(due.getDate() + protocol.interval_days);
    setNextDueDate(formatDateBR(due));
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError('Descreva o evento (ex.: nome da vacina ou tratamento).');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createEvent({
      event_type: eventType,
      description: description.trim(),
      next_due_date: parseDate(nextDueDate) ?? undefined,
      protocol_id: protocolId ?? undefined,
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
      <ScreenHeader title="Registrar evento de saúde" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {protocolOptions.length > 0 ? (
            <View style={styles.protocolBlock}>
              <ChipSelect
                label="Protocolo (opcional — calcula a próxima dose sozinho)"
                options={protocolOptions}
                value={protocolId}
                onChange={applyProtocol}
                accentColor={colors.pecuaria}
              />
            </View>
          ) : null}
          <ChipSelect label="Tipo" options={EVENT_TYPE_OPTIONS} value={eventType} onChange={setEventType} accentColor={colors.pecuaria} />
          <TextField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Vacina febre aftosa" />
          <TextField
            label="Próxima dose/retorno"
            value={nextDueDate}
            onChangeText={setNextDueDate}
            placeholder="DD/MM/AAAA (opcional)"
            keyboardType="numbers-and-punctuation"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!description} />
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
    protocolBlock: {
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    error: {
      color: colors.danger,
    },
  });
}
