import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TextField } from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { useT } from '../../src/i18n';
import { spacing, typography, useColors, type Colors } from '../../src/theme';

export default function ContaScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { signOut } = useAuth();
  const { profile, isLoading, updateFullName, updatePassword } = useProfile();

  const [fullName, setFullName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? '');
  }, [profile]);

  async function handleSaveName() {
    setNameError(null);
    setNameSaved(false);
    if (!fullName.trim()) {
      setNameError(t('settings.account.nameEmptyError'));
      return;
    }
    setIsSavingName(true);
    const { error } = await updateFullName(fullName.trim());
    setIsSavingName(false);
    if (error) {
      setNameError(error);
      return;
    }
    setNameSaved(true);
  }

  async function handleSavePassword() {
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 6) {
      setPasswordError(t('settings.account.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.account.passwordMismatch'));
      return;
    }
    setIsSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsSavingPassword(false);
    if (error) {
      setPasswordError(error);
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSaved(true);
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login');
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
      <ScreenHeader title={t('settings.account')} subtitle={profile?.email ?? undefined} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.account.name')}</Text>
          <TextField label={t('settings.account.fullName')} value={fullName} onChangeText={setFullName} placeholder={t('auth.signup.fullNamePlaceholder')} />
          {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
          {nameSaved ? <Text style={styles.success}>{t('settings.account.nameUpdated')}</Text> : null}
          <Button label={t('settings.account.saveName')} onPress={handleSaveName} loading={isSavingName} disabled={!fullName.trim()} />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.account.changePassword')}</Text>
          <TextField
            label={t('settings.account.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder={t('auth.signup.passwordPlaceholder')}
          />
          <TextField
            label={t('settings.account.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder={t('auth.signup.passwordPlaceholder')}
          />
          {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
          {passwordSaved ? <Text style={styles.success}>{t('settings.account.passwordUpdated')}</Text> : null}
          <Button
            label={t('settings.account.savePassword')}
            onPress={handleSavePassword}
            loading={isSavingPassword}
            disabled={!newPassword || !confirmPassword}
          />
        </Card>

        <Button label={t('settings.account.signOut')} variant="secondary" onPress={handleSignOut} />
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
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    success: {
      ...typography.caption,
      color: colors.success,
    },
  });
}
