import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuthBenefits } from '../../src/components/AuthBenefits';
import { AuthHero } from '../../src/components/AuthHero';
import { Button } from '../../src/components/Button';
import { FadeSlideIn } from '../../src/components/FadeSlideIn';
import { TextField } from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { useT } from '../../src/i18n';
import { fetchAgroNews, type AgroNewsItem } from '../../src/lib/agroNews';
import { radius, spacing, typography, useColors, type Colors } from '../../src/theme';

export default function LoginScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [news, setNews] = useState<AgroNewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAgroNews().then((items) => {
      if (!cancelled) setNews(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError);
      return;
    }
    router.replace('/setor');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <AuthHero title="FarmPro" tagline={t('auth.login.tagline')} />
        <AuthBenefits />

        <View style={styles.body}>
          <FadeSlideIn delay={80}>
            <View style={styles.form}>
              <Text style={styles.title}>{t('auth.login.title')}</Text>
              <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>

              <TextField
                label={t('auth.login.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="voce@email.com"
              />
              <TextField
                label={t('auth.login.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label={t('auth.login.submit')} onPress={handleSubmit} loading={isSubmitting} disabled={!email || !password} />

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('auth.login.noAccount')}</Text>
                <Link href="/auth/signup" style={styles.footerLink}>
                  {t('auth.login.createAccount')}
                </Link>
              </View>
            </View>
          </FadeSlideIn>

          {news.length > 0 ? (
            <FadeSlideIn delay={280}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('auth.login.newsTitle')}</Text>
                <View style={styles.newsList}>
                  {news.map((item) => (
                    <Pressable
                      key={item.link}
                      style={({ pressed }) => [styles.newsCard, pressed && styles.newsCardPressed]}
                      onPress={() => Linking.openURL(item.link)}
                    >
                      <Text style={styles.newsTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.source ? <Text style={styles.newsSource}>{item.source}</Text> : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            </FadeSlideIn>
          ) : null}
        </View>
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
    body: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.xxl,
    },
    form: {
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
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    footerText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    footerLink: {
      ...typography.bodyMedium,
      color: colors.primary,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    newsList: {
      gap: spacing.sm,
    },
    newsCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: 2,
    },
    newsCardPressed: {
      opacity: 0.7,
    },
    newsTitle: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    newsSource: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
}
