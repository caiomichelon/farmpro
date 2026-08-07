import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TIME_ENTRY_TYPE_LABELS } from '../../../../../../src/data/employeeOptions';
import { useTimeEntries } from '../../../../../../src/hooks/useTimeEntries';
import type { TimeEntry } from '../../../../../../src/types/database';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

export default function TimeClockScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { entries, todaysEntries, nextEntryType, isLoading, error, createEntry } = useTimeEntries(employeeId);
  const [isPunching, setIsPunching] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);

  async function handlePunch() {
    if (!nextEntryType) return;
    setIsPunching(true);
    setPunchError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPunchError('Permissão de localização negada. Ative nas configurações do dispositivo para bater o ponto.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const { error: createError } = await createEntry({
        entry_type: nextEntryType,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        location_accuracy_m: position.coords.accuracy ?? undefined,
      });
      if (createError) setPunchError(createError);
    } catch {
      setPunchError('Não foi possível obter sua localização agora. Tente novamente.');
    } finally {
      setIsPunching(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Ponto digital" subtitle="Com geolocalização" />

      <View style={styles.punchArea}>
        <View style={styles.todayRow}>
          {(['entrada', 'saida_almoco', 'volta_almoco', 'saida'] as const).map((type) => {
            const done = todaysEntries.some((e) => e.entry_type === type);
            return (
              <View key={type} style={[styles.todayChip, done && styles.todayChipDone]}>
                <Text style={[styles.todayChipText, done && styles.todayChipTextDone]}>
                  {TIME_ENTRY_TYPE_LABELS[type]}
                </Text>
              </View>
            );
          })}
        </View>

        {nextEntryType ? (
          <Button
            label={`Bater ponto — ${TIME_ENTRY_TYPE_LABELS[nextEntryType]}`}
            onPress={handlePunch}
            loading={isPunching}
          />
        ) : (
          <Text style={styles.doneText}>Todas as batidas de hoje já foram registradas.</Text>
        )}
        {punchError ? <Text style={styles.error}>{punchError}</Text> : null}
      </View>

      <Text style={styles.historyTitle}>Histórico</Text>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="Nenhum ponto registrado ainda." />}
          renderItem={({ item }) => <EntryRow entry={item} />}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </SafeAreaView>
  );
}

function EntryRow({ entry }: { entry: TimeEntry }) {
  return (
    <Card style={styles.entryCard}>
      <View style={styles.entryTopRow}>
        <Text style={styles.entryType}>{TIME_ENTRY_TYPE_LABELS[entry.entry_type]}</Text>
        <Text style={styles.entryTime}>{formatDateTime(entry.recorded_at)}</Text>
      </View>
      {entry.latitude != null && entry.longitude != null ? (
        <Text style={styles.entryLocation}>
          {entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}
          {entry.location_accuracy_m != null ? ` · ±${Math.round(entry.location_accuracy_m)}m` : ''}
        </Text>
      ) : (
        <Text style={styles.entryLocation}>Sem localização registrada</Text>
      )}
    </Card>
  );
}

function formatDateTime(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  punchArea: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  todayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  todayChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  todayChipDone: {
    backgroundColor: colors.funcionariosLight,
    borderColor: colors.funcionarios,
  },
  todayChipText: {
    ...typography.captionMedium,
    color: colors.textMuted,
  },
  todayChipTextDone: {
    color: colors.funcionarios,
  },
  doneText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  historyTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  loading: {
    marginTop: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  entryCard: {
    marginBottom: spacing.md,
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryType: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  entryTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  entryLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
  error: {
    color: colors.danger,
  },
});
