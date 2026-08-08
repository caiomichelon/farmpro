import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { TextField } from '../../src/components/TextField';
import { useFarms, type FarmSummary } from '../../src/hooks/useFarms';
import { joinFarmByCode } from '../../src/hooks/useFarmMembers';
import { useT } from '../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../src/theme';

type FooterMode = 'none' | 'creating' | 'joining';

export default function FarmSelectionScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farms, isLoading, error, createFarm, reload: reloadFarms } = useFarms();
  const [footerMode, setFooterMode] = useState<FooterMode>('none');
  const isCreating = footerMode === 'creating';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t('farms.eyebrow')}</Text>
          <Text style={styles.title}>{t('farms.title')}</Text>
        </View>
        <Pressable onPress={() => router.push('/ajustes')} hitSlop={12}>
          <Text style={styles.settingsIcon}>{t('farms.settings')}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!isCreating ? <EmptyState text={t('farms.empty')} /> : null}
          renderItem={({ item }) => <FarmCard farm={item} styles={styles} t={t} onPress={() => router.push(`/farms/${item.id}`)} />}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        {footerMode === 'creating' ? (
          <NewFarmForm
            onCancel={() => setFooterMode('none')}
            onCreate={async (values) => {
              const { error: createError } = await createFarm(values);
              if (!createError) setFooterMode('none');
              return createError;
            }}
          />
        ) : footerMode === 'joining' ? (
          <JoinFarmForm
            onCancel={() => setFooterMode('none')}
            onJoin={async (code) => {
              const { error: joinError, farmId } = await joinFarmByCode(code);
              if (!joinError) {
                setFooterMode('none');
                await reloadFarms();
                if (farmId) router.push(`/farms/${farmId}`);
              }
              return joinError;
            }}
          />
        ) : (
          <View style={styles.footerButtons}>
            <Button label={t('farms.newFarm')} variant="secondary" onPress={() => setFooterMode('creating')} style={{ flex: 1 }} />
            <Button label={t('farms.joinWithCode')} variant="ghost" onPress={() => setFooterMode('joining')} style={{ flex: 1 }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function FarmCard({
  farm,
  onPress,
  styles,
  t,
}: {
  farm: FarmSummary;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  t: ReturnType<typeof useT>;
}) {
  const location = [farm.city, farm.state].filter(Boolean).join(' / ');
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Text style={styles.cardTitle}>{farm.name}</Text>
      {location ? <Text style={styles.cardLocation}>{location}</Text> : null}
      <View style={styles.cardStatsRow}>
        <Text style={styles.cardStat}>
          {farm.totalHectares.toLocaleString('pt-BR')} {t('farms.hectares')}
        </Text>
        <Text style={styles.cardStatDivider}>·</Text>
        <Text style={styles.cardStat}>
          {farm.totalPlots} {farm.totalPlots === 1 ? t('farms.plot') : t('farms.plots')}
        </Text>
      </View>
    </Pressable>
  );
}

function NewFarmForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: { name: string; city?: string; state?: string }) => Promise<string | null>;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const createError = await onCreate({ name: name.trim(), city: city.trim(), state: state.trim() });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <TextField label={t('farms.newFarmName')} value={name} onChangeText={setName} placeholder={t('farms.newFarmNamePlaceholder')} />
      <View style={styles.formRow}>
        <View style={{ flex: 2 }}>
          <TextField label={t('farms.city')} value={city} onChangeText={setCity} placeholder={t('farms.optional')} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label={t('farms.state')} value={state} onChangeText={setState} placeholder={t('farms.optional')} maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label={t('farms.cancel')} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={t('farms.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!name} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function JoinFarmForm({
  onCancel,
  onJoin,
}: {
  onCancel: () => void;
  onJoin: (code: string) => Promise<string | null>;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const joinError = await onJoin(code.trim());
    setIsSubmitting(false);
    if (joinError) setError(joinError);
  }

  return (
    <View style={styles.form}>
      <TextField
        label={t('farms.inviteCode')}
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        placeholder={t('farms.inviteCodePlaceholder')}
        autoCapitalize="characters"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label={t('farms.cancel')} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={t('farms.join')} onPress={handleSubmit} loading={isSubmitting} disabled={!code.trim()} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    eyebrow: {
      ...typography.label,
      color: colors.textMuted,
    },
    title: {
      ...typography.displayMd,
      color: colors.textPrimary,
    },
    settingsIcon: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    cardPressed: {
      opacity: 0.8,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    cardLocation: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    cardStat: {
      ...typography.captionMedium,
      color: colors.primary,
    },
    cardStatDivider: {
      color: colors.textMuted,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    form: {
      gap: spacing.md,
    },
    formRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xs,
    },
  });
}
