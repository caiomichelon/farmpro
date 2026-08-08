import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { useEmployee } from '../../../../../../src/hooks/useEmployees';
import { useEmployeeMessages } from '../../../../../../src/hooks/useEmployeeMessages';
import type { EmployeeMessage, EmployeeMessageSender } from '../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

const SENDER_OPTIONS: { value: EmployeeMessageSender; label: string }[] = [
  { value: 'gerente', label: 'Gerente' },
  { value: 'funcionario', label: 'Funcionário' },
];

export default function EmployeeMessagesScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { employee } = useEmployee(employeeId);
  const { messages, isLoading, reload, sendMessage, markReadByManager } = useEmployeeMessages(employeeId);
  const [sendingAs, setSendingAs] = useState<EmployeeMessageSender>('gerente');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      reload();
      markReadByManager();
    }, [reload, markReadByManager])
  );

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  async function handleSend() {
    if (!body.trim()) return;
    setIsSending(true);
    const { error } = await sendMessage(sendingAs, body);
    setIsSending(false);
    if (!error) setBody('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Mensagens" subtitle={employee?.full_name} />

      <View style={styles.senderRow}>
        <ChipSelect label="Enviando como" options={SENDER_OPTIONS} value={sendingAs} onChange={setSendingAs} accentColor={colors.funcionarios} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      ) : messages.length === 0 ? (
        <EmptyState text="Nenhuma mensagem ainda. Comece a conversa." />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList}>
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} styles={styles} colors={colors} />
          ))}
        </ScrollView>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composerRow}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor={colors.textMuted}
            style={styles.composerInput}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!body.trim() || isSending}
            style={({ pressed }) => [styles.sendButton, (pressed || !body.trim()) && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message, styles, colors }: { message: EmployeeMessage; styles: ReturnType<typeof createStyles>; colors: Colors }) {
  const isManager = message.sender === 'gerente';
  return (
    <View style={[styles.bubbleRow, isManager ? styles.bubbleRowManager : styles.bubbleRowEmployee]}>
      <View style={[styles.bubble, { backgroundColor: isManager ? colors.primary : colors.funcionariosLight }]}>
        <Text style={[styles.bubbleText, { color: isManager ? colors.textInverse : colors.textPrimary }]}>{message.body}</Text>
        <Text style={[styles.bubbleTime, { color: isManager ? colors.textInverse : colors.textMuted }]}>{formatTime(message.created_at)}</Text>
      </View>
    </View>
  );
}

function formatTime(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    senderRow: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    messageList: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      gap: spacing.sm,
      flexGrow: 1,
    },
    bubbleRow: {
      flexDirection: 'row',
    },
    bubbleRowEmployee: {
      justifyContent: 'flex-start',
    },
    bubbleRowManager: {
      justifyContent: 'flex-end',
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 2,
    },
    bubbleText: {
      ...typography.body,
    },
    bubbleTime: {
      ...typography.caption,
      alignSelf: 'flex-end',
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    composerInput: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      maxHeight: 100,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    sendButton: {
      backgroundColor: colors.funcionarios,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      ...typography.captionMedium,
      color: colors.textInverse,
    },
  });
}
