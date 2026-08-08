import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { HEALTH_EVENT_TYPE_LABELS } from '../../../../../../src/hooks/useCattleAnimalHealth';
import { useCattleHealthProtocols } from '../../../../../../src/hooks/useCattleHealthProtocols';
import type { CattleHealthEventType, CattleHealthProtocol } from '../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

const EVENT_TYPE_OPTIONS = Object.entries(HEALTH_EVENT_TYPE_LABELS).map(([value, label]) => ({
  value: value as CattleHealthEventType,
  label,
}));

/** Protocolos sanitários recorrentes da fazenda — o "modelo" de vacina ou
 * tratamento (ex.: "Aftosa" a cada 180 dias) que, ao ser escolhido num
 * evento de saúde de um animal, calcula a próxima dose sozinho. */
export default function HealthProtocolsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { protocols, isLoading, error, createProtocol, deleteProtocol } = useCattleHealthProtocols(farmId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Protocolos sanitários" subtitle="Vacinas e tratamentos recorrentes do rebanho" />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.pecuaria} />
        ) : protocols.length === 0 ? (
          <EmptyState text="Nenhum protocolo cadastrado ainda. Crie um pra não ter que digitar a data da próxima dose toda vez." />
        ) : (
          protocols.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} styles={styles} onDelete={() => deleteProtocol(protocol.id)} />
          ))
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isAdding ? (
          <NewProtocolForm
            styles={styles}
            colors={colors}
            onCancel={() => setIsAdding(false)}
            onCreate={async (values) => {
              const { error: createError } = await createProtocol(values);
              if (!createError) setIsAdding(false);
              return createError;
            }}
          />
        ) : (
          <Button label="+ Novo protocolo" variant="secondary" onPress={() => setIsAdding(true)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProtocolCard({
  protocol,
  styles,
  onDelete,
}: {
  protocol: CattleHealthProtocol;
  styles: ReturnType<typeof createStyles>;
  onDelete: () => void;
}) {
  return (
    <Card style={styles.protocolCard}>
      <View style={styles.protocolTopRow}>
        <Text style={styles.protocolName}>{protocol.name}</Text>
        <Text style={styles.protocolInterval}>a cada {protocol.interval_days} dias</Text>
      </View>
      <Text style={styles.protocolMeta}>{HEALTH_EVENT_TYPE_LABELS[protocol.event_type]}</Text>
      {protocol.notes ? <Text style={styles.protocolMeta}>{protocol.notes}</Text> : null}
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteLink}>Excluir</Text>
      </Pressable>
    </Card>
  );
}

function NewProtocolForm({
  onCancel,
  onCreate,
  styles,
  colors,
}: {
  onCancel: () => void;
  onCreate: (values: { name: string; event_type: CattleHealthEventType; interval_days: number; notes?: string }) => Promise<string | null>;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<CattleHealthEventType>('vacina');
  const [intervalDays, setIntervalDays] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const intervalValue = Number(intervalDays);
    if (!name.trim() || !intervalValue || intervalValue <= 0) {
      setError('Informe o nome e o intervalo em dias entre as doses.');
      return;
    }
    setIsSubmitting(true);
    const createError = await onCreate({
      name: name.trim(),
      event_type: eventType,
      interval_days: intervalValue,
      notes: notes.trim() || undefined,
    });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Aftosa" />
      <ChipSelect label="Tipo" options={EVENT_TYPE_OPTIONS} value={eventType} onChange={setEventType} accentColor={colors.pecuaria} />
      <TextField
        label="Intervalo entre doses (dias)"
        value={intervalDays}
        onChangeText={setIntervalDays}
        placeholder="Ex.: 180"
        keyboardType="number-pad"
      />
      <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!name || !intervalDays} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    protocolCard: {
      gap: 2,
    },
    protocolTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    protocolName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    protocolInterval: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    protocolMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    deleteLink: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
    },
    form: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    error: {
      color: colors.danger,
    },
  });
}
