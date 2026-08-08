import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useAuth } from '../../../src/context/AuthContext';
import { useFarmMembers, type FarmMemberWithProfile } from '../../../src/hooks/useFarmMembers';
import { useT, type TFunction } from '../../../src/i18n';
import type { FarmInvite, FarmRole } from '../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function roleLabels(t: TFunction): Record<FarmRole, string> {
  return { admin: t('members.roleAdmin'), campo: t('members.roleCampo') };
}

export default function MembrosScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { session } = useAuth();
  const { members, invites, isLoading, error, createInvite, removeMember } = useFarmMembers(farmId);
  const isAdmin = members.find((m) => m.user_id === session?.user.id)?.role === 'admin';

  const [newInviteRole, setNewInviteRole] = useState<FarmRole>('campo');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [justCreatedCode, setJustCreatedCode] = useState<string | null>(null);

  async function handleCreateInvite() {
    setInviteError(null);
    setJustCreatedCode(null);
    setIsCreatingInvite(true);
    const { error: createError, code } = await createInvite(newInviteRole);
    setIsCreatingInvite(false);
    if (createError) {
      setInviteError(createError);
      return;
    }
    setJustCreatedCode(code);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('members.title')} subtitle={t('members.subtitle')} />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Section title={t('members.who')}>
            {members.length === 0 ? (
              <EmptyState text={t('members.empty')} />
            ) : (
              members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  styles={styles}
                  colors={colors}
                  t={t}
                  isSelf={member.user_id === session?.user.id}
                  onRemove={
                    isAdmin && member.user_id !== session?.user.id ? () => removeMember(member.user_id) : undefined
                  }
                />
              ))
            )}
          </Section>

          {isAdmin ? (
          <Section title={t('members.invite')} subtitle={t('members.inviteSubtitle')}>
            <ChipSelect
              label={t('members.inviteRole')}
              options={[
                { value: 'campo', label: t('members.roleCampo') },
                { value: 'admin', label: t('members.roleAdmin') },
              ]}
              value={newInviteRole}
              onChange={setNewInviteRole}
              accentColor={colors.primary}
            />
            <Button label={t('members.generateCode')} onPress={handleCreateInvite} loading={isCreatingInvite} />
            {inviteError ? <Text style={styles.error}>{inviteError}</Text> : null}
            {justCreatedCode ? (
              <Card style={styles.codeCard}>
                <Text style={styles.codeLabel}>{t('members.codeGenerated')}</Text>
                <Text style={styles.codeValue}>{justCreatedCode}</Text>
              </Card>
            ) : null}

            {invites.length > 0 ? (
              <View style={styles.invitesList}>
                <Text style={styles.invitesTitle}>{t('members.activeCodes')}</Text>
                {invites.map((invite) => (
                  <InviteRow key={invite.id} invite={invite} styles={styles} t={t} />
                ))}
              </View>
            ) : null}
          </Section>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function MemberRow({
  member,
  isSelf,
  onRemove,
  styles,
  colors,
  t,
}: {
  member: FarmMemberWithProfile;
  isSelf: boolean;
  onRemove?: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
  t: TFunction;
}) {
  return (
    <Card style={styles.memberCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>
          {member.fullName ?? member.email ?? t('members.fallbackName')}
          {isSelf ? t('members.you') : ''}
        </Text>
        {member.email ? <Text style={styles.memberEmail}>{member.email}</Text> : null}
        <Text style={styles.memberRole}>{roleLabels(t)[member.role]}</Text>
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={[styles.removeLink, { color: colors.danger }]}>{t('members.remove')}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function InviteRow({ invite, styles, t }: { invite: FarmInvite; styles: ReturnType<typeof createStyles>; t: TFunction }) {
  const expiresLabel = new Date(invite.expires_at).toLocaleDateString('pt-BR');
  return (
    <View style={styles.inviteRow}>
      <Text style={styles.inviteCode}>{invite.code}</Text>
      <Text style={styles.inviteMeta}>
        {roleLabels(t)[invite.role]} · {t('members.expiresOn', { date: expiresLabel })}
      </Text>
    </View>
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
      gap: spacing.xxl,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
    },
    sectionBody: {
      gap: spacing.md,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    memberName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    memberEmail: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    memberRole: {
      ...typography.caption,
      color: colors.primary,
      marginTop: 2,
    },
    removeLink: {
      ...typography.captionMedium,
    },
    codeCard: {
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surfaceAlt,
    },
    codeLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    codeValue: {
      ...typography.displayMd,
      color: colors.primary,
      letterSpacing: 4,
    },
    invitesList: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    invitesTitle: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    inviteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
    },
    inviteCode: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      letterSpacing: 2,
    },
    inviteMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
