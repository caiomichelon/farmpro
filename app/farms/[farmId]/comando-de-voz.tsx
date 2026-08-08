import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useCattleLots } from '../../../src/hooks/useCattleLots';
import { useFarmAlerts } from '../../../src/hooks/useFarmAlerts';
import { parseVoiceCommand } from '../../../src/lib/voiceCommands';
import { spacing, typography, useColors, type Colors } from '../../../src/theme';

// Reconhecimento de fala nativo do navegador — só existe na web (Chrome/
// Edge/Safari recentes). No app nativo (Expo Go), não tem lib de
// reconhecimento de fala embutida sem sair do Expo Go, então a alternativa
// é digitar o comando — mesma resposta falada de volta nos dois casos.
function getBrowserSpeechRecognition(): any {
  if (Platform.OS !== 'web') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoiceCommandScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots } = useCattleLots(farmId);
  const { alerts } = useFarmAlerts(farmId);

  const [typedText, setTypedText] = useState('');
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognitionClass = useMemo(() => getBrowserSpeechRecognition(), []);

  useEffect(() => {
    return () => {
      Speech.stop();
      recognitionRef.current?.stop?.();
    };
  }, []);

  function findLot(spokenText: string) {
    const match = lots.find((l) => spokenText.includes(l.name.toLowerCase()));
    if (!match) return null;
    return { name: match.name, currentHeadCount: match.currentHeadCount, latestWeightKg: match.latestWeightKg };
  }

  function handleCommand(text: string) {
    if (!text.trim()) return;
    setHeard(text);
    const weatherRiskTitles = alerts.filter((a) => a.category === 'clima').map((a) => a.title);
    const readyLotNames = lots.filter((l) => l.status === 'ativo' && l.readiness === 'pronto').map((l) => l.name);
    const result = parseVoiceCommand(text, { readyLotNames, weatherRiskTitles, findLot });
    setReply(result.reply);
    Speech.speak(result.reply, { language: 'pt-BR' });
    if (result.navigateTo) {
      setTimeout(() => router.push(`/farms/${farmId}/${result.navigateTo}` as never), 400);
    }
  }

  function handleStartListening() {
    if (!SpeechRecognitionClass) return;
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      handleCommand(transcript);
    };
    recognition.start();
  }

  function handleStopListening() {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Ei FarmPro" subtitle="Pergunte sobre clima, lotes, peso, boletim ou relatório" />

      <ScrollView contentContainerStyle={styles.content}>
        {SpeechRecognitionClass ? (
          <View style={styles.micWrap}>
            <Pressable
              style={[styles.micButton, { backgroundColor: isListening ? colors.danger : colors.pecuaria }]}
              onPress={isListening ? handleStopListening : handleStartListening}
            >
              <Text style={styles.micIcon}>{isListening ? '⏹' : '🎙️'}</Text>
            </Pressable>
            <Text style={styles.micHint}>{isListening ? 'Ouvindo... fala aí' : 'Toque e fale seu comando'}</Text>
          </View>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{SpeechRecognitionClass ? 'Ou digite' : 'Digite seu comando'}</Text>
          {SpeechRecognitionClass ? null : (
            <Text style={styles.hint}>
              Reconhecimento de voz nativo ainda não disponível no app instalado — digite aqui por enquanto, a
              resposta continua sendo falada em voz alta.
            </Text>
          )}
          <TextField label="Comando" value={typedText} onChangeText={setTypedText} placeholder="Ex.: quantas cabeças tem o lote 3?" />
          <Button
            label="Enviar"
            onPress={() => {
              handleCommand(typedText);
              setTypedText('');
            }}
          />
        </Card>

        {heard ? (
          <Card style={styles.card}>
            <Text style={styles.exchangeLabel}>Você perguntou</Text>
            <Text style={styles.exchangeText}>{heard}</Text>
          </Card>
        ) : null}

        {reply ? (
          <Card style={styles.successCard}>
            <Text style={styles.exchangeLabel}>FarmPro respondeu</Text>
            <Text style={styles.exchangeText}>{reply}</Text>
          </Card>
        ) : null}

        <Text style={styles.examplesTitle}>Exemplos de comando</Text>
        <Text style={styles.exampleItem}>"Como tá o clima?"</Text>
        <Text style={styles.exampleItem}>"Quais lotes estão prontos pra abate?"</Text>
        <Text style={styles.exampleItem}>"Quantas cabeças tem o lote 3?"</Text>
        <Text style={styles.exampleItem}>"Abre o boletim de hoje"</Text>
        <Text style={styles.exampleItem}>"Gera o relatório pro banco"</Text>
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
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    micWrap: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xl,
    },
    micButton: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micIcon: {
      fontSize: 40,
    },
    micHint: {
      ...typography.body,
      color: colors.textSecondary,
    },
    card: {
      gap: spacing.sm,
    },
    successCard: {
      gap: spacing.xs,
      borderColor: colors.successLight,
      backgroundColor: colors.successLight,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    exchangeLabel: {
      ...typography.captionMedium,
      color: colors.textMuted,
    },
    exchangeText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    examplesTitle: {
      ...typography.captionMedium,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    exampleItem: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
