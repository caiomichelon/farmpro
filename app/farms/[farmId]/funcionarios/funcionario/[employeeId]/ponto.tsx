import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { DataTable, type DataTableColumn } from '../../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { LocationMap } from '../../../../../../src/components/LocationMap';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TIME_ENTRY_TYPE_LABELS } from '../../../../../../src/data/employeeOptions';
import { useTimeEntries } from '../../../../../../src/hooks/useTimeEntries';
import type { TimeEntry } from '../../../../../../src/types/database';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

function buildColumns(): DataTableColumn<TimeEntry>[] {
  return [
    { key: 'type', label: 'Tipo', width: 130, render: (e) => TIME_ENTRY_TYPE_LABELS[e.entry_type] },
    { key: 'when', label: 'Data/hora', width: 130, render: (e) => formatDateTime(e.recorded_at) },
    {
      key: 'location',
      label: 'Localização',
      width: 160,
      render: (e) =>
        e.latitude != null && e.longitude != null
          ? `${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}`
          : 'Sem localização',
    },
  ];
}

export default function TimeClockScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { entries, todaysEntries, nextEntryType, isLoading, error, createEntry } = useTimeEntries(employeeId);
  const columns = useMemo(() => buildColumns(), []);
  const [isPunching, setIsPunching] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [punchQueuedMessage, setPunchQueuedMessage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const mapPoints = entries
    .filter((e) => e.latitude != null && e.longitude != null)
    .slice(0, 20)
    .map((e) => ({
      latitude: e.latitude as number,
      longitude: e.longitude as number,
      label: `${TIME_ENTRY_TYPE_LABELS[e.entry_type]} — ${formatDateTime(e.recorded_at)}`,
    }));

  async function handlePunch() {
    if (!nextEntryType) return;
    setIsPunching(true);
    setPunchError(null);
    setPunchQueuedMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPunchError('Permissão de localização negada. Ative nas configurações do dispositivo para bater o ponto.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const { error: createError, queued } = await createEntry({
        entry_type: nextEntryType,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        location_accuracy_m: position.coords.accuracy ?? undefined,
      });
      if (createError) setPunchError(createError);
      else if (queued) setPunchQueuedMessage('Sem sinal — ponto guardado no aparelho, vai sincronizar sozinho.');
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
        {punchQueuedMessage ? <Text style={styles.queued}>{punchQueuedMessage}</Text> : null}
      </View>

      <View style={styles.historyHeaderRow}>
        <Text style={styles.historyTitle}>Histórico</Text>
        {mapPoints.length > 0 ? (
          <Pressable onPress={() => setShowMap((v) => !v)} hitSlop={8}>
            <Text style={styles.mapToggle}>{showMap ? 'Ocultar mapa' : 'Ver mapa'}</Text>
          </Pressable>
        ) : null}
      </View>

      {showMap && mapPoints.length > 0 ? (
        <View style={styles.mapContainer}>
          <LocationMap points={mapPoints} />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      ) : entries.length === 0 ? (
        <EmptyState text="Nenhum ponto registrado ainda." />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <DataTable title="Ponto" columns={columns} data={entries} keyExtractor={(e) => e.id} />
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </SafeAreaView>
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
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  historyTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  mapToggle: {
    ...typography.captionMedium,
    color: colors.funcionarios,
  },
  mapContainer: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  loading: {
    marginTop: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
  error: {
    color: colors.danger,
  },
  queued: {
    ...typography.caption,
    color: colors.warning,
  },
});
