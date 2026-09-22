import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleActivityGroups } from '../../../../../src/hooks/useCattleActivityGroups';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { useT } from '../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function formatDateShort(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Ponto único pra ver e trocar animais entre todas as "áreas" do gado —
 * o semi-confinamento (que já tem seu módulo completo, Corte) e qualquer
 * outro setor leve criado na hora (pasto, suplementação proteica etc.).
 * Pensado pra ser fácil de navegar mesmo por quem usa o app pouco. */
export default function CattleSectorsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading: lotsLoading, reload: reloadLots } = useCattleLots(farmId);
  const { groups, isLoading: groupsLoading, error, reload: reloadGroups } = useCattleActivityGroups(farmId);

  useFocusEffect(
    useCallback(() => {
      reloadLots();
      reloadGroups();
    }, [reloadLots, reloadGroups])
  );

  const isLoading = lotsLoading || groupsLoading;
  const semiHeadCount = lots.filter((l) => l.status === 'ativo').reduce((sum, l) => sum + l.currentHeadCount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('cattleSectors.title')} subtitle={t('cattleSectors.subtitle')} />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.content}>
          <FadeSlideIn>
            <Pressable
              style={({ pressed }) => [styles.sectorRow, styles.semiRow, pressed && styles.rowPressed]}
              onPress={() => router.push(`/farms/${farmId}/pecuaria/corte`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sectorTitle}>{t('cattleSectors.semiTitle')}</Text>
                <Text style={styles.sectorSubtitle}>{t('cattleSectors.semiSubtitle', { count: semiHeadCount })}</Text>
              </View>
              <Text style={styles.chevron}>→</Text>
            </Pressable>
          </FadeSlideIn>

          {groups.length === 0 ? (
            <EmptyState text={t('cattleSectors.empty')} />
          ) : (
            groups.map((group, index) => (
              <FadeSlideIn key={group.id} delay={Math.min(index, 6) * 50}>
                <Pressable
                  style={({ pressed }) => [styles.sectorRow, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/farms/${farmId}/pecuaria/setores/${group.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectorTitle}>{group.sector_name}</Text>
                    <Text style={styles.sectorSubtitle}>
                      {t('cattleSectors.rowSubtitle', { count: group.head_count, date: formatDateShort(group.updated_at) })}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>→</Text>
                </Pressable>
              </FadeSlideIn>
            ))
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button label={t('cattleSectors.newSector')} onPress={() => router.push(`/farms/${farmId}/pecuaria/setores/novo`)} />
      </View>
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
    // Sem isso, o aviso de erro (sibling logo abaixo) pode sumir no iOS com
    // New Architecture — bug conhecido de FlatList/ScrollView sem
    // style={flex:1} escondendo conteúdo irmão renderizado depois dele
    // (facebook/react-native#44683).
    list: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    sectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
    },
    semiRow: {
      backgroundColor: colors.pecuariaLight,
      borderColor: colors.pecuaria,
    },
    rowPressed: {
      opacity: 0.8,
    },
    sectorTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    sectorSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    chevron: {
      ...typography.heading,
      color: colors.pecuaria,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}
