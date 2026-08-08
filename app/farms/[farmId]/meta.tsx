import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useConsolidatedResult } from '../../../src/hooks/useConsolidatedResult';
import { useFarm } from '../../../src/hooks/useFarms';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FarmGoalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading: farmLoading, updateFarmGoal } = useFarm(farmId);
  const { result, isLoading: resultLoading } = useConsolidatedResult(farmId);

  const [isEditing, setIsEditing] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = farmLoading || resultLoading || !farm;

  function startEditing() {
    setGoalName(farm?.goal_name ?? '');
    setGoalAmount(farm?.goal_amount != null ? String(farm.goal_amount) : '');
    setError(null);
    setIsEditing(true);
  }

  async function handleSave() {
    if (!farmId) return;
    const amount = Number(goalAmount.replace(',', '.'));
    if (!goalName.trim() || !amount || amount <= 0) {
      setError('Preencha um nome e um valor válido pra meta.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const { error: saveError } = await updateFarmGoal(farmId, goalName.trim(), amount);
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setIsEditing(false);
  }

  async function handleClear() {
    if (!farmId) return;
    setIsSaving(true);
    await updateFarmGoal(farmId, null, null);
    setIsSaving(false);
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const hasGoal = farm.goal_name && farm.goal_amount;

  if (isEditing || !hasGoal) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="Cofrinho da meta" subtitle="Uma meta concreta pra acompanhar o resultado da fazenda" />
        <View style={styles.content}>
          <Card style={styles.card}>
            <TextField label="O que você quer conquistar?" value={goalName} onChangeText={setGoalName} placeholder="Ex.: Trator novo" />
            <TextField
              label="Valor da meta (R$)"
              value={goalAmount}
              onChangeText={setGoalAmount}
              keyboardType="decimal-pad"
              placeholder="Ex.: 150000"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label="Salvar meta" onPress={handleSave} loading={isSaving} />
            {hasGoal ? <Button label="Cancelar" variant="ghost" onPress={() => setIsEditing(false)} /> : null}
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const goalAmountNum = Number(farm.goal_amount);
  const progressPct = Math.max(0, Math.min(100, (result / goalAmountNum) * 100));
  const remaining = goalAmountNum - result;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Cofrinho da meta" subtitle="Uma meta concreta pra acompanhar o resultado da fazenda" />
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.goalTitle}>🐷 {farm.goal_name}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: progressPct >= 100 ? colors.success : colors.primary }]} />
          </View>
          <Text style={styles.progressLabel}>
            {currency(Math.max(0, result))} de {currency(goalAmountNum)} ({progressPct.toFixed(0)}%)
          </Text>
          <Text style={styles.hint}>
            {remaining > 0
              ? `Faltam ${currency(remaining)} pra bater a meta.`
              : '🎉 Meta batida! Hora de comemorar ou definir a próxima.'}
          </Text>
        </Card>

        <Button label="Editar meta" variant="secondary" onPress={startEditing} />
        <Button label="Remover meta" variant="ghost" onPress={handleClear} loading={isSaving} />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    content: {
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.md,
    },
    goalTitle: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    progressTrack: {
      height: 16,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    progressLabel: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
