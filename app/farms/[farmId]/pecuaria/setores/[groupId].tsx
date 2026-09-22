import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useCattleActivityGroups } from '../../../../../src/hooks/useCattleActivityGroups';
import { useT } from '../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

export default function CattleSectorDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, groupId } = useLocalSearchParams<{ farmId: string; groupId: string }>();
  const { groups, isLoading, reload, updateGroup, deleteGroup, transfer } = useCattleActivityGroups(farmId);
  const group = groups.find((g) => g.id === groupId);

  const [sectorName, setSectorName] = useState('');
  const [headCount, setHeadCount] = useState('');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [transferCount, setTransferCount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    if (group && !initialized) {
      setSectorName(group.sector_name);
      setHeadCount(String(group.head_count));
      setNotes(group.notes ?? '');
      setInitialized(true);
    }
  }, [group, initialized]);

  async function handleSave() {
    if (!group) return;
    setError(null);
    const headCountValue = Number(headCount);
    if (!sectorName.trim()) {
      setError(t('cattleSectorDetail.errorName'));
      return;
    }
    if (!headCountValue || headCountValue < 0) {
      setError(t('cattleSectorDetail.errorHeadCount'));
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await updateGroup(group.id, {
      sector_name: sectorName,
      head_count: headCountValue,
      notes,
    });
    setIsSaving(false);
    if (updateError) setError(updateError);
  }

  async function handleTransfer() {
    if (!group) return;
    setTransferError(null);
    const count = Number(transferCount);
    if (!transferTo.trim()) {
      setTransferError(t('cattleSectorDetail.transferErrorDestination'));
      return;
    }
    if (!count || count <= 0) {
      setTransferError(t('cattleSectorDetail.transferErrorCount'));
      return;
    }

    setIsTransferring(true);
    const { error: transferErr } = await transfer({ fromGroupId: group.id, toSectorName: transferTo, headCount: count });
    setIsTransferring(false);

    if (transferErr) {
      setTransferError(transferErr);
      return;
    }
    router.back();
  }

  function handleDelete() {
    if (!group) return;
    Alert.alert(t('cattleSectorDetail.deleteConfirmTitle'), t('cattleSectorDetail.deleteConfirmMessage'), [
      { text: t('cattleSectorDetail.deleteCancel'), style: 'cancel' },
      {
        text: t('cattleSectorDetail.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await deleteGroup(group.id);
          if (deleteError) {
            setError(deleteError);
            return;
          }
          router.back();
        },
      },
    ]);
  }

  if (isLoading || !group) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={group.sector_name} subtitle={t('cattleSectorDetail.subtitle', { count: group.head_count })} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.bigNumberBanner}>
            <Text style={styles.bigNumber}>{group.head_count}</Text>
            <Text style={styles.bigNumberLabel}>{t('cattleSectors.headsLabel')}</Text>
          </View>

          {/* Transferir vem primeiro porque, no dia a dia do campo, mover
              animais de um setor pra outro é bem mais comum do que só
              renomear ou corrigir o setor. */}
          <Card style={[styles.card, styles.transferCard]}>
            <Text style={styles.cardTitle}>{t('cattleSectorDetail.transferTitle')}</Text>
            <Text style={styles.transferHint}>{t('cattleSectorDetail.transferHint')}</Text>
            <TextField
              label={t('cattleSectorDetail.transferCountLabel')}
              value={transferCount}
              onChangeText={setTransferCount}
              keyboardType="number-pad"
              placeholder={t('cattleSectorDetail.transferCountPlaceholder', { max: group.head_count })}
            />
            <TextField
              label={t('cattleSectorDetail.transferToLabel')}
              value={transferTo}
              onChangeText={setTransferTo}
              placeholder={t('cattleSectorDetail.transferToPlaceholder')}
            />
            {transferError ? <Text style={styles.error}>{transferError}</Text> : null}
            <Button label={t('cattleSectorDetail.transferSubmit')} onPress={handleTransfer} loading={isTransferring} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>{t('cattleSectorDetail.editTitle')}</Text>
            <TextField label={t('cattleSectorDetail.nameLabel')} value={sectorName} onChangeText={setSectorName} />
            <TextField
              label={t('cattleSectorDetail.headCountLabel')}
              value={headCount}
              onChangeText={setHeadCount}
              keyboardType="number-pad"
            />
            <TextField label={t('cattleSectorDetail.notesLabel')} value={notes} onChangeText={setNotes} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={t('cattleSectorDetail.save')} variant="secondary" onPress={handleSave} loading={isSaving} />
          </Card>

          <Button label={t('cattleSectorDetail.delete')} variant="ghost" onPress={handleDelete} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    bigNumberBanner: {
      alignItems: 'center',
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
    },
    bigNumber: {
      ...typography.displayLg,
      fontSize: 44,
      lineHeight: 50,
      color: colors.pecuaria,
    },
    bigNumberLabel: {
      ...typography.subheading,
      color: colors.pecuaria,
      marginTop: spacing.xs,
    },
    card: {
      gap: spacing.md,
      backgroundColor: colors.surface,
    },
    transferCard: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.pecuaria,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    transferHint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
    },
    error: {
      color: colors.danger,
    },
  });
}
