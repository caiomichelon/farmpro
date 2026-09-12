import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { useT } from '../../src/i18n';
import { buildResetPasswordRedirectUrl } from '../../src/lib/authRecovery';
import { withTimeout } from '../../src/lib/withTimeout';
import { spacing, typography, useColors, type Colors } from '../../src/theme';

const REQUEST_TIMEOUT_MS = 12000;

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { sendPasswordResetEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    // Não revelamos se o e-mail existe ou não na conta — a mensagem de
    // sucesso é sempre a mesma, tenha dado erro ou não (evita que alguém
    // use esse formulário pra descobrir e-mails cadastrados no app). E o
    // timeout garante que uma conexão ruim (que nunca dá erro nem sucesso,
    // só fica pendurada) não deixa a tela travada no botão de carregando.
    try {
      await withTimeout(sendPasswordResetEmail(email.trim(), buildResetPasswordRedirectUrl()), REQUEST_TIMEOUT_MS, {
        error: 'timeout',
      });
    } catch {
      // Silencioso de propósito — mesmo motivo do comentário acima.
    }
    setIsSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={styles.title}>{t('auth.forgotPassword.sentTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPassword.sentMessage', { email: email.trim() })}</Text>
          <Link href="/auth/login" style={styles.link}>
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.body}>
        <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.forgotPassword.subtitle')}</Text>

        <TextField
          label={t('auth.forgotPassword.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@email.com"
        />
        <Button label={t('auth.forgotPassword.submit')} onPress={handleSubmit} loading={isSubmitting} disabled={!email.trim()} />

        <Link href="/auth/login" style={styles.link}>
          {t('auth.forgotPassword.backToLogin')}
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    title: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    link: {
      ...typography.bodyMedium,
      color: colors.primary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
}
