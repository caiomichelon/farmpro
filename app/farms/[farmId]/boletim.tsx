import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useBreedingCows } from '../../../src/hooks/useBreedingCows';
import { useCattleLots } from '../../../src/hooks/useCattleLots';
import { useFarm } from '../../../src/hooks/useFarms';
import { useFarmAlerts } from '../../../src/hooks/useFarmAlerts';
import { buildBriefingText } from '../../../src/lib/dailyBriefing';
import { spacing, typography, useColors, type Colors } from '../../../src/theme';

function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export default function DailyBriefingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading: farmLoading } = useFarm(farmId);
  const { alerts, isLoading: alertsLoading } = useFarmAlerts(farmId);
  const { lots, isLoading: lotsLoading } = useCattleLots(farmId);
  const { cows, isLoading: cowsLoading } = useBreedingCows(farmId);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isLoading = farmLoading || alertsLoading || lotsLoading || cowsLoading || !farm;

  const readyLotNames = lots.filter((l) => l.status === 'ativo' && l.readiness === 'pronto').map((l) => l.name);
  const upcomingCalvings = cows
    .filter((c) => c.isPregnant && c.expectedCalvingDate)
    .map((c) => ({ identification: c.identification, daysUntil: daysUntil(c.expectedCalvingDate as string) }))
    .filter((c) => c.daysUntil >= 0);

  const briefingText = isLoading
    ? ''
    : buildBriefingText({
        farmName: farm.name,
        alerts: alerts.map((a) => ({ title: a.title, severity: a.severity })),
        readyLotNames,
        upcomingCalvings,
      });

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  function handlePlay() {
    if (!briefingText) return;
    setIsSpeaking(true);
    Speech.speak(briefingText, {
      language: 'pt-BR',
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  function handleStop() {
    Speech.stop();
    setIsSpeaking(false);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Boletim da fazenda" subtitle="Resumo falado do que importa hoje" />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.briefingText}>{briefingText}</Text>
        </Card>

        {isSpeaking ? (
          <Button label="⏹ Parar" variant="secondary" onPress={handleStop} />
        ) : (
          <Button label="▶️ Ouvir boletim" onPress={handlePlay} />
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
    loading: {
      marginTop: spacing.xxl,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.sm,
    },
    briefingText: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 24,
    },
  });
}
