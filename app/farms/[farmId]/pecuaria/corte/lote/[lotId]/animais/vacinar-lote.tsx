import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../../src/components/TextField';
import { useCattleAnimals } from '../../../../../../../../src/hooks/useCattleAnimals';
import { createBulkHealthEvent, HEALTH_EVENT_TYPE_LABELS } from '../../../../../../../../src/hooks/useCattleAnimalHealth';
import { useCattleHealthProtocols } from '../../../../../../../../src/hooks/useCattleHealthProtocols';
import type { CattleHealthEventType } from '../../../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../../src/theme';

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

function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/** Aplica o mesmo evento de saúde num monte de animal do lote de uma vez —
 * pra quando é a vacina do lote inteiro, não faz sentido entrar animal por
 * animal. */
export default function BulkVaccinationScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { animals, isLoading } = useCattleAnimals(lotId);
  const { protocols } = useCattleHealthProtocols(farmId);

  const activeAnimals = animals.filter((a) => a.status === 'ativo');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [eventType, setEventType] = useState<CattleHealthEventType>('vacina');
  const [description, setDescription] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const protocolOptions = protocols.map((p) => ({ value: p.id, label: p.name }));
  const allSelected = activeAnimals.length > 0 && selected.size === activeAnimals.length;

  function toggleAnimal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(activeAnimals.map((a) => a.id)));
  }

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
    setError(null);
    setIsSubmitting(true);
    const { error: createError } = await createBulkHealthEvent(Array.from(selected), {
      event_type: eventType,
      description,
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
      <ScreenHeader title="Aplicar em lote" subtitle="Mesma vacina/tratamento pra vários animais de uma vez" />
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

          <View style={styles.animalsHeaderRow}>
            <Text style={styles.animalsTitle}>
              Animais ({selected.size}/{activeAnimals.length} selecionados)
            </Text>
            <Pressable onPress={toggleAll} hitSlop={8}>
              <Text style={styles.selectAllLink}>{allSelected ? 'Limpar seleção' : 'Selecionar todos'}</Text>
            </Pressable>
          </View>

          {isLoading ? null : activeAnimals.length === 0 ? (
            <EmptyState text="Nenhum animal ativo nesse lote." />
          ) : (
            activeAnimals.map((animal) => {
              const isSelected = selected.has(animal.id);
              return (
                <Pressable key={animal.id} onPress={() => toggleAnimal(animal.id)} style={styles.animalRow}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.animalTag}>{animal.tag_number}</Text>
                </Pressable>
              );
            })
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={`Aplicar em ${selected.size} ${selected.size === 1 ? 'animal' : 'animais'}`}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!description.trim() || selected.size === 0}
          />
        </ScrollView>
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
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    protocolBlock: {
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    animalsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    animalsTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    selectAllLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    animalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: radius.sm,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.pecuaria,
      borderColor: colors.pecuaria,
    },
    checkboxMark: {
      color: colors.textInverse,
      fontWeight: 'bold',
      fontSize: 14,
    },
    animalTag: {
      ...typography.body,
      color: colors.textPrimary,
    },
    error: {
      color: colors.danger,
    },
  });
}
