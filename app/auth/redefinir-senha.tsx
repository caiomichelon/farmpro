import * as ExpoLinking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { useT } from '../../src/i18n';
import { parseAuthParamsFromUrl } from '../../src/lib/authRecovery';
import { supabase } from '../../src/lib/supabase';
import { withTimeout } from '../../src/lib/withTimeout';
import { spacing, typography, useColors, type Colors } from '../../src/theme';

type Stage = 'checking' | 'invalidLink' | 'ready' | 'success';

const REQUEST_TIMEOUT_MS = 12000;

/** Tela que recebe o link de e-mail de redefinição de senha. O Supabase
 * manda o access_token/refresh_token de recuperação dentro da própria URL
 * (no fragmento, depois do "#", ou às vezes na query) — como o cliente
 * Supabase deste app tem `detectSessionInUrl: false` (ver src/lib/supabase.ts),
 * essa extração é feita manualmente aqui, funcionando igual no app nativo
 * (link `farmpro://...`) e na versão web publicada. */
export default function ResetPasswordScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  const [stage, setStage] = useState<Stage>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      const initialUrl = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : await ExpoLinking.getInitialURL();
      if (!initialUrl) {
        if (!cancelled) setStage('invalidLink');
        return;
      }

      const params = parseAuthParamsFromUrl(initialUrl);
      if (params.error || params.error_description) {
        if (!cancelled) setStage('invalidLink');
        return;
      }
      if (!params.access_token || !params.refresh_token) {
        if (!cancelled) setStage('invalidLink');
        return;
      }

      // try/catch + timeout por segurança: se setSession lançar uma exceção
      // inesperada, ou simplesmente nunca resolver numa conexão ruim (não é
      // erro nem sucesso, só fica pendurada), a tela não pode ficar travada
      // pra sempre no "Verificando o link...".
      let sessionError: unknown = 'timeout';
      try {
        const result = await withTimeout(
          supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token }),
          REQUEST_TIMEOUT_MS,
          'timeout' as const
        );
        // `result` só é a string 'timeout' quando o prazo estourou (o
        // fallback do withTimeout) — uma resposta de verdade do Supabase
        // sempre é um objeto `{ error }`, nunca uma string.
        sessionError = result === 'timeout' ? 'timeout' : result.error;
      } catch (err) {
        sessionError = err;
      }
      if (cancelled) return;
      setStage(sessionError ? 'invalidLink' : 'ready');
    }

    establishRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    setError(null);
    if (password.length < 8) {
      setError(t('auth.resetPassword.tooShortError'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.mismatchError'));
      return;
    }
    setIsSubmitting(true);
    // Timeout aqui não pode ser silencioso como no pedido de link por
    // e-mail — se isso travar de verdade, a pessoa precisa saber que a
    // senha NÃO foi trocada, pra tentar de novo, em vez de achar que deu
    // certo e sair da tela.
    const result = await withTimeout(supabase.auth.updateUser({ password }), REQUEST_TIMEOUT_MS, 'timeout' as const);
    setIsSubmitting(false);
    if (result === 'timeout') {
      setError(t('auth.resetPassword.timeoutError'));
      return;
    }
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setStage('success');
    setTimeout(() => router.replace('/setor'), 1200);
  }

  if (stage === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.subtitle}>{t('auth.resetPassword.checking')}</Text>
      </View>
    );
  }

  if (stage === 'invalidLink') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('auth.resetPassword.invalidLinkTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.resetPassword.invalidLinkMessage')}</Text>
        <Link href="/auth/esqueci-senha" style={styles.link}>
          {t('auth.resetPassword.requestNewLink')}
        </Link>
      </View>
    );
  }

  if (stage === 'success') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.subtitle}>{t('auth.resetPassword.success')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.body}>
        <Text style={styles.title}>{t('auth.resetPassword.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.resetPassword.subtitle')}</Text>

        <TextField
          label={t('auth.resetPassword.newPassword')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <TextField
          label={t('auth.resetPassword.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={t('auth.resetPassword.submit')}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!password || !confirmPassword}
        />
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
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
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
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    link: {
      ...typography.bodyMedium,
      color: colors.primary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
}
