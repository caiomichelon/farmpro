import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, typography } from '../../src/theme';

export default function SignupScreen() {
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
    const { error: signUpError } = await signUp(email.trim(), password, fullName.trim());
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    // Se a confirmação de e-mail estiver habilitada no projeto Supabase, ainda
    // não há sessão aqui — avisamos o usuário em vez de navegar direto.
    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Quase lá</Text>
          <Text style={styles.subtitle}>
            Enviamos um e-mail de confirmação para {email}. Confirme para poder entrar.
          </Text>
          <Button label="Voltar para o login" onPress={() => router.replace('/auth/login')} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Comece a usar o FarmPro</Text>

        <View style={styles.form}>
          <TextField label="Nome completo" value={fullName} onChangeText={setFullName} placeholder="Seu nome" />
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="voce@email.com"
          />
          <TextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Mínimo de 6 caracteres"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Criar conta"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!email || !password || !fullName}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem conta?</Text>
          <Link href="/auth/login" style={styles.footerLink}>
            Entrar
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    ...typography.displayMd,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.lg,
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
