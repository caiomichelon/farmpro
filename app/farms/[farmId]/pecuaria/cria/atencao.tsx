import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DataTable, type DataTableColumn } from '../../../../../src/components/DataTable';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useBreedingCows, type BreedingCowSummary } from '../../../../../src/hooks/useBreedingCows';
import { useT } from '../../../../../src/i18n';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function buildColumns(t: ReturnType<typeof useT>): DataTableColumn<BreedingCowSummary>[] {
  return [
    { key: 'id', label: t('repasse.colId'), width: 130, render: (c) => c.identification },
    { key: 'days', label: t('repasse.colDays'), width: 100, render: (c) => String(c.daysEmpty ?? '—') },
    { key: 'calves', label: t('repasse.colCalves'), width: 90, render: (c) => String(c.calfCount) },
    { key: 'lastInsem', label: t('repasse.colLastInsem'), width: 150, render: (c) => (c.lastInseminationDate ? formatDate(c.lastInseminationDate) : '—') },
  ];
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Matrizes vazias — separadas em "repasse recomendado" (vazia há pouco
 * tempo, ainda dá pra reinseminar tranquilo) e "vazia há muito tempo"
 * (>90 dias, precisa de ação urgente ou considerar descarte). */
export default function RepasseScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error, reload } = useBreedingCows(farmId);
  const t = useT();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const recentlyEmpty = cows
    .filter((c) => c.reproductiveStatus === 'vazia')
    .sort((a, b) => (b.daysEmpty ?? 0) - (a.daysEmpty ?? 0));
  const attentionCows = cows
    .filter((c) => c.reproductiveStatus === 'vazia_atencao')
    .sort((a, b) => (b.daysEmpty ?? 0) - (a.daysEmpty ?? 0));

  const columns = buildColumns(t);
  const isEmpty = recentlyEmpty.length === 0 && attentionCows.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('repasse.title')}
        subtitle={t('repasse.subtitleCount', { recent: String(recentlyEmpty.length), attention: String(attentionCows.length) })}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : isEmpty ? (
        <EmptyState text={t('repasse.emptyAll')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {attentionCows.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('repasse.sectionAttentionTitle')}</Text>
              <Text style={styles.sectionSubtitle}>{t('repasse.sectionAttentionSubtitle')}</Text>
              <DataTable
                title={t('repasse.sectionAttentionTitle')}
                columns={columns}
                data={attentionCows}
                keyExtractor={(c) => c.id}
                onRowPress={(c) => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${c.id}`)}
              />
            </View>
          ) : null}

          {recentlyEmpty.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('repasse.sectionRecentTitle')}</Text>
              <Text style={styles.sectionSubtitle}>{t('repasse.sectionRecentSubtitle')}</Text>
              <DataTable
                title={t('repasse.sectionRecentTitle')}
                columns={columns}
                data={recentlyEmpty}
                keyExtractor={(c) => c.id}
                onRowPress={(c) => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${c.id}`)}
              />
            </View>
          ) : null}
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
      gap: spacing.xl,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
