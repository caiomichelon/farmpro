import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuthBenefits } from '../../src/components/AuthBenefits';
import { AuthHero } from '../../src/components/AuthHero';
import { Button } from '../../src/components/Button';
import { FadeSlideIn } from '../../src/components/FadeSlideIn';
import { TextField } from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { useT } from '../../src/i18n';
import { spacing, typography, useColors, type Colors } from '../../src/theme';

export default function SignupScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const { error: signUpError, hasSession } = await signUp(email.trim(), password, fullName.trim());
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    // Se a confirmação de e-mail estiver desligada no projeto Supabase, o
    // cadastro já vem com sessão ativa — entra direto, sem pedir confirmação
    // de algo que não é necessário.
    if (hasSession) {
      router.replace('/setor');
      return;
    }

    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <View style={styles.container}>
        <AuthHero title="FarmPro" tagline={t('auth.login.tagline')} />
        <FadeSlideIn style={styles.confirmContent}>
          <Text style={styles.title}>{t('auth.signup.confirmTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.signup.confirmSubtitle', { email })}</Text>
          <Button label={t('auth.signup.backToLogin')} onPress={() => router.replace('/auth/login')} />
        </FadeSlideIn>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <AuthHero title="FarmPro" tagline={t('auth.login.tagline')} />
        <AuthBenefits />

        <FadeSlideIn delay={80} style={styles.body}>
          <Text style={styles.title}>{t('auth.signup.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.signup.subtitle')}</Text>

          <View style={styles.form}>
            <TextField label={t('auth.signup.fullName')} value={fullName} onChangeText={setFullName} placeholder={t('auth.signup.fullNamePlaceholder')} />
            <TextField
              label={t('auth.signup.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="voce@email.com"
            />
            <TextField
              label={t('auth.signup.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('auth.signup.passwordPlaceholder')}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              label={t('auth.signup.submit')}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!email || !password || !fullName}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.signup.hasAccount')}</Text>
            <Link href="/auth/login" style={styles.footerLink}>
              {t('auth.signup.signIn')}
            </Link>
          </View>
        </FadeSlideIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    confirmContent: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.xl,
    },
    body: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    title: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: -spacing.md,
    },
    form: {
      gap: spacing.lg,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    footerText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    footerLink: {
      ...typography.bodyMedium,
      color: colors.primary,
    },
  });
}
