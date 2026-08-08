import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBreedingCows } from '../../../src/hooks/useBreedingCows';
import { useCattleLots } from '../../../src/hooks/useCattleLots';
import { useFarm } from '../../../src/hooks/useFarms';
import { useFarmAlerts } from '../../../src/hooks/useFarmAlerts';
import { getCommodityQuotes } from '../../../src/data/commodities';
import { buildBriefingText } from '../../../src/lib/dailyBriefing';
import { buildSellRecommendations } from '../../../src/lib/sellRecommendation';
import { spacing, typography, useColors, type Colors } from '../../../src/theme';

function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Modo carro — tela de painel, letra grande e alto contraste, pra ser
 * consultada de relance (ou só ouvida) sem precisar cutucar botão pequeno
 * dirigindo. Toca o boletim sozinho assim que abre. Ativação é manual
 * (toque no botão na home) — detectar conexão Bluetooth automaticamente
 * exigiria sair do Expo Go, então por enquanto é "toquei, logo tô no
 * carro". */
export default function CarModeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading: farmLoading } = useFarm(farmId);
  const { alerts, isLoading: alertsLoading } = useFarmAlerts(farmId);
  const { lots, isLoading: lotsLoading } = useCattleLots(farmId);
  const { cows, isLoading: cowsLoading } = useBreedingCows(farmId);
  const [boiGordoPrice, setBoiGordoPrice] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  useEffect(() => {
    getCommodityQuotes().then((quotes) => {
      setBoiGordoPrice(quotes.find((q) => q.id === 'boi-gordo')?.price ?? 0);
    });
  }, []);

  const isLoading = farmLoading || alertsLoading || lotsLoading || cowsLoading || !farm;

  const readyLotNames = lots.filter((l) => l.status === 'ativo' && l.readiness === 'pronto').map((l) => l.name);
  const upcomingCalvings = cows
    .filter((c) => c.isPregnant && c.expectedCalvingDate)
    .map((c) => ({ identification: c.identification, daysUntil: daysUntil(c.expectedCalvingDate as string) }))
    .filter((c) => c.daysUntil >= 0);
  const sellRecommendations = buildSellRecommendations(
    lots.filter((l) => l.status === 'ativo'),
    boiGordoPrice
  );

  const briefingText = isLoading
    ? ''
    : buildBriefingText({
        farmName: farm.name,
        alerts: alerts.map((a) => ({ title: a.title, severity: a.severity })),
        readyLotNames,
        upcomingCalvings,
        sellRecommendations: sellRecommendations.map((r) => ({ lotName: r.lotName, marginPct: r.marginPct })),
      });

  useEffect(() => {
    if (!isLoading && briefingText && !hasAutoPlayed) {
      setHasAutoPlayed(true);
      setIsSpeaking(true);
      Speech.speak(briefingText, {
        language: 'pt-BR',
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  }, [isLoading, briefingText, hasAutoPlayed]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  function handleReplay() {
    if (!briefingText) return;
    setIsSpeaking(true);
    Speech.speak(briefingText, {
      language: 'pt-BR',
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.farmName}>{farm?.name ?? '...'}</Text>
        <Text style={styles.modeLabel}>🚗 Modo carro</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.textInverse} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            <View style={styles.bigStatsRow}>
              <BigStat value={String(dangerCount + warningCount)} label="alertas" accent={dangerCount > 0} styles={styles} />
              <BigStat value={String(readyLotNames.length)} label="prontos pra abate" styles={styles} />
              <BigStat value={String(sellRecommendations.length)} label="boa hora de vender" styles={styles} />
            </View>

            <Pressable
              style={[styles.playButton, isSpeaking && styles.playButtonActive]}
              onPress={isSpeaking ? () => Speech.stop() : handleReplay}
            >
              <Text style={styles.playButtonText}>{isSpeaking ? '⏹ Parar' : '🔁 Repetir boletim'}</Text>
            </Pressable>

            <Pressable style={styles.voiceButton} onPress={() => router.push(`/farms/${farmId}/comando-de-voz`)}>
              <Text style={styles.voiceButtonText}>🎙️ Falar comando</Text>
            </Pressable>

            <Pressable style={styles.exitButton} onPress={() => router.back()}>
              <Text style={styles.exitButtonText}>Sair do modo carro</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BigStat({ value, label, accent, styles }: { value: string; label: string; accent?: boolean; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.bigStat}>
      <Text style={[styles.bigStatValue, accent && styles.bigStatValueAccent]}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryDark,
    },
    content: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.lg,
    },
    farmName: {
      ...typography.displayMd,
      color: colors.textInverse,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    modeLabel: {
      ...typography.body,
      color: colors.textInverse,
      opacity: 0.7,
    },
    bigStatsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    bigStat: {
      alignItems: 'center',
      gap: 2,
    },
    bigStatValue: {
      ...typography.displayLg,
      color: colors.textInverse,
    },
    bigStatValueAccent: {
      color: colors.warning,
    },
    bigStatLabel: {
      ...typography.caption,
      color: colors.textInverse,
      opacity: 0.75,
      textAlign: 'center',
    },
    playButton: {
      width: '100%',
      backgroundColor: colors.accent,
      borderRadius: spacing.lg,
      paddingVertical: spacing.xl,
      alignItems: 'center',
      marginTop: spacing.xxl,
    },
    playButtonActive: {
      backgroundColor: colors.danger,
    },
    playButtonText: {
      ...typography.displayMd,
      color: colors.textInverse,
    },
    voiceButton: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: spacing.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    voiceButtonText: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    exitButton: {
      paddingVertical: spacing.lg,
    },
    exitButtonText: {
      ...typography.bodyMedium,
      color: colors.textInverse,
      opacity: 0.6,
    },
  });
}
