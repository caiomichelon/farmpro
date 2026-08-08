import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useRainReadings } from '../../../src/hooks/useRainReadings';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatMonthBR(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[Number(month) - 1]}/${year}`;
}

export default function RainGaugeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { readings, monthlyTotals, currentMonthTotalMm, isLoading, saveReading } = useRainReadings(farmId);

  const [date, setDate] = useState(todayIso());
  const [mm, setMm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const mmValue = Number(mm.replace(',', '.'));
    if (!date || Number.isNaN(mmValue)) {
      setError('Preencha a data e a chuva em milímetros.');
      return;
    }
    setIsSaving(true);
    const { error: saveError } = await saveReading({ reading_date: date, mm: mmValue });
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setMm('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🌧️ Pluviômetro" subtitle="Chuva do dia — acompanhe o acumulado por mês" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Chuva no mês</Text>
          <Text style={styles.currentMonthValue}>{currentMonthTotalMm.toFixed(1)} mm</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Lançar chuva do dia</Text>
          <View style={styles.formRow}>
            <View style={styles.dateInput}>
              <TextField label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-08-08" />
            </View>
            <View style={styles.mmInput}>
              <TextField label="mm" value={mm} onChangeText={setMm} placeholder="Ex.: 12" keyboardType="decimal-pad" />
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button label="Salvar" onPress={handleSave} loading={isSaving} />
        </Card>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <>
            {monthlyTotals.length > 1 ? (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Acumulado por mês</Text>
                {monthlyTotals.map((m) => (
                  <View key={m.month} style={styles.monthRow}>
                    <Text style={styles.monthLabel}>{formatMonthBR(m.month)}</Text>
                    <Text style={styles.monthValue}>{m.totalMm.toFixed(1)} mm</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            <Text style={styles.sectionTitle}>Lançamentos recentes</Text>
            {readings.length === 0 ? (
              <EmptyState text="Nenhuma chuva lançada ainda." />
            ) : (
              readings.slice(0, 30).map((r) => (
                <Card key={r.id} style={styles.readingCard}>
                  <Text style={styles.readingDate}>{formatDateBR(r.reading_date)}</Text>
                  <Text style={styles.readingValue}>{Number(r.mm).toFixed(1)} mm</Text>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    card: {
      gap: spacing.sm,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    currentMonthValue: {
      ...typography.displayMd,
      color: colors.primary,
    },
    formRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    dateInput: {
      flex: 2,
    },
    mmInput: {
      flex: 1,
    },
    loading: {
      marginTop: spacing.xl,
    },
    monthRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    monthLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    monthValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    readingCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
    },
    readingDate: {
      ...typography.body,
      color: colors.textSecondary,
    },
    readingValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
