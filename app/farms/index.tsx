import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { FadeSlideIn } from '../../src/components/FadeSlideIn';
import { SectorDotsCluster } from '../../src/components/SectorDotsCluster';
import { TextField } from '../../src/components/TextField';
import { useFarms, type FarmSummary } from '../../src/hooks/useFarms';
import { joinFarmByCode } from '../../src/hooks/useFarmMembers';
import { useT, type TFunction } from '../../src/i18n';
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
      <FadeSlideIn>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.eyebrow}>{t('farms.eyebrow')}</Text>
            <Pressable onPress={() => router.push('/ajustes')} hitSlop={12}>
              <Text style={styles.settingsIcon}>{t('farms.settings')}</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{t('farms.title')}</Text>
          <Text style={styles.subtitle}>{t('farms.subtitle')}</Text>
          <View style={styles.dotsRow}>
            <SectorDotsCluster size={8} />
          </View>
        </View>
      </FadeSlideIn>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!isCreating ? <FarmsEmptyState styles={styles} t={t} /> : null}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={Math.min(index, 6) * 60}>
              <FarmCard farm={item} styles={styles} colors={colors} t={t} onPress={() => router.push(`/farms/${item.id}`)} />
            </FadeSlideIn>
          )}
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
  colors,
  t,
}: {
  farm: FarmSummary;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
  t: TFunction;
}) {
  const location = [farm.city, farm.state].filter(Boolean).join(' / ');
  const initial = farm.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{farm.name}</Text>
          {location ? <Text style={styles.cardLocation}>{location}</Text> : null}
        </View>
      </View>
      <View style={styles.cardStatsRow}>
        <Text style={styles.cardStat}>
          {farm.totalHectares.toLocaleString('pt-BR')} {t('farms.hectares')}
        </Text>
        <Text style={styles.cardStatDivider}>·</Text>
        <Text style={styles.cardStat}>
          {farm.totalPlots} {farm.totalPlots === 1 ? t('farms.plot') : t('farms.plots')}
        </Text>
      </View>
      {farm.lavouraHectares > 0 || farm.pecuariaHectares > 0 ? (
        <View style={styles.cardChipsRow}>
          {farm.lavouraHectares > 0 ? (
            <View style={[styles.cardChip, { backgroundColor: colors.lavouraLight }]}>
              <Text style={[styles.cardChipText, { color: colors.lavoura }]}>
                🌱 {t('farms.lavouraChip')} · {farm.lavouraHectares.toLocaleString('pt-BR')} ha
              </Text>
            </View>
          ) : null}
          {farm.pecuariaHectares > 0 ? (
            <View style={[styles.cardChip, { backgroundColor: colors.pecuariaLight }]}>
              <Text style={[styles.cardChipText, { color: colors.pecuaria }]}>
                🐄 {t('farms.pecuariaChip')} · {farm.pecuariaHectares.toLocaleString('pt-BR')} ha
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function FarmsEmptyState({ styles, t }: { styles: ReturnType<typeof createStyles>; t: TFunction }) {
  return (
    <FadeSlideIn delay={80}>
      <View style={styles.emptyState}>
        <View style={styles.emptyBadge}>
          <Text style={styles.emptyBadgeIcon}>🌾</Text>
        </View>
        <Text style={styles.emptyTitle}>{t('farms.emptyTitle')}</Text>
        <Text style={styles.emptySubtitle}>{t('farms.emptySubtitle')}</Text>
      </View>
    </FadeSlideIn>
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
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.xs,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    eyebrow: {
      ...typography.label,
      color: colors.textInverse,
      opacity: 0.7,
    },
    title: {
      ...typography.displayMd,
      color: colors.textInverse,
    },
    subtitle: {
      ...typography.body,
      color: colors.textInverse,
      opacity: 0.85,
    },
    settingsIcon: {
      ...typography.bodyMedium,
      color: colors.textInverse,
      opacity: 0.9,
    },
    dotsRow: {
      marginTop: spacing.sm,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    cardPressed: {
      opacity: 0.8,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    cardAvatar: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardAvatarText: {
      ...typography.subheading,
      color: colors.textInverse,
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
    },
    cardStat: {
      ...typography.captionMedium,
      color: colors.primary,
    },
    cardStatDivider: {
      color: colors.textMuted,
    },
    cardChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    cardChip: {
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    cardChipText: {
      ...typography.captionMedium,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    emptyBadge: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      backgroundColor: colors.lavouraLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    emptyBadgeIcon: {
      fontSize: 30,
    },
    emptyTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    emptySubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
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
