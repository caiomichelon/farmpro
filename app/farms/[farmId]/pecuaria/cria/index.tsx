import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { StatGrid } from '../../../../../src/components/StatGrid';
import { TextField } from '../../../../../src/components/TextField';
import {
  COW_CATEGORY_LABELS,
  REPRODUCTIVE_STATUS_LABELS,
  useBreedingCows,
  type BreedingCowSummary,
  type ReproductiveStatus,
} from '../../../../../src/hooks/useBreedingCows';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

const STATUS_COLOR_KEY: Record<ReproductiveStatus, 'pecuaria' | 'textMuted' | 'danger' | 'warning'> = {
  aguardando_dg: 'warning',
  prenha_confirmada: 'pecuaria',
  prenha_presumida: 'pecuaria',
  vazia: 'textMuted',
  vazia_atencao: 'danger',
  nunca_coberta: 'textMuted',
};

export default function CriaHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error, reload } = useBreedingCows(farmId);
  const [search, setSearch] = useState('');

  // "Nova matriz" é uma rota separada — refaz a busca ao voltar pra cá.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const pregnantCount = cows.filter((c) => c.isPregnant).length;
  const attentionCount = cows.filter((c) => c.reproductiveStatus === 'vazia_atencao').length;
  const totalCalves = cows.reduce((sum, c) => sum + c.calfCount, 0);
  const pregnancyRate = cows.length > 0 ? (pregnantCount / cows.length) * 100 : 0;
  const totalCost = cows.reduce((sum, c) => sum + c.totalCost, 0);
  const costPerCalf = totalCalves > 0 ? totalCost / totalCalves : null;
  const intervalCows = cows.filter((c) => c.avgCalvingIntervalDays !== null);
  const avgHerdCalvingInterval =
    intervalCows.length > 0
      ? intervalCows.reduce((sum, c) => sum + (c.avgCalvingIntervalDays ?? 0), 0) / intervalCows.length
      : null;

  const filteredCows = search.trim()
    ? cows.filter((c) => c.identification.toLowerCase().includes(search.trim().toLowerCase()))
    : cows;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Cria / Reprodução"
        subtitle={`${cows.length} ${cows.length === 1 ? 'matriz' : 'matrizes'}`}
        right={
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/importar`)} hitSlop={12}>
              <Text style={styles.headerLink}>Importar</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/planilha`)} hitSlop={12}>
              <Text style={styles.headerLink}>Planilha</Text>
            </Pressable>
          </View>
        }
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : (
        <FlatList
          data={filteredCows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <StatGrid
                stats={[
                  { label: 'Matrizes', value: String(cows.length) },
                  { label: 'Prenhas agora', value: String(pregnantCount) },
                  { label: 'Bezerros até hoje', value: String(totalCalves) },
                  { label: 'Taxa de prenhez', value: `${pregnancyRate.toFixed(0)}%` },
                  {
                    label: 'Intervalo entre partos',
                    value: avgHerdCalvingInterval !== null ? `${Math.round(avgHerdCalvingInterval)} dias` : '—',
                  },
                ]}
              />

              {attentionCount > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.attentionBanner, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/atencao`)}
                >
                  <Text style={styles.attentionBannerText}>
                    ⚠ {attentionCount} {attentionCount === 1 ? 'matriz vazia' : 'matrizes vazias'} há mais de 90 dias
                  </Text>
                  <Text style={styles.attentionBannerChevron}>→</Text>
                </Pressable>
              ) : null}

              <Card style={styles.financialCard}>
                <Text style={styles.financialTitle}>Custo</Text>
                <View style={styles.financialRow}>
                  <View style={styles.financialCell}>
                    <Text style={styles.financialLabel}>Custo total</Text>
                    <Text style={[styles.financialValue, { color: colors.danger }]}>
                      {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                  </View>
                  <View style={styles.financialDivider} />
                  <View style={styles.financialCell}>
                    <Text style={styles.financialLabel}>Custo por bezerro</Text>
                    <Text style={styles.financialValue}>
                      {costPerCalf !== null ? costPerCalf.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                    </Text>
                  </View>
                </View>
              </Card>

              <View style={styles.linksRow}>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/partos-previstos`)} hitSlop={8}>
                  <Text style={styles.link}>Partos previstos</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/financeiro`)} hitSlop={8}>
                  <Text style={styles.link}>Financeiro por matriz</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/atencao`)} hitSlop={8}>
                  <Text style={styles.link}>Atenção</Text>
                </Pressable>
                <Text style={styles.linkDivider}>·</Text>
                <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/benchmarking`)} hitSlop={8}>
                  <Text style={styles.link}>Benchmarking</Text>
                </Pressable>
              </View>

              <TextField label="Buscar matriz" value={search} onChangeText={setSearch} placeholder="Digite a identificação" />
            </View>
          }
          ListEmptyComponent={<EmptyState text="Nenhuma matriz cadastrada ainda. Comece criando a primeira." />}
          renderItem={({ item }) => (
            <CowCard cow={item} styles={styles} colors={colors} onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${item.id}`)} />
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button label="+ Nova matriz" onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/nova-matriz`)} />
      </View>
    </SafeAreaView>
  );
}

function CowCard({
  cow,
  onPress,
  styles,
  colors,
}: {
  cow: BreedingCowSummary;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  const statusColor = colors[STATUS_COLOR_KEY[cow.reproductiveStatus]];
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{cow.identification}</Text>
        <Text style={styles.cardStat}>
          {cow.calfCount} {cow.calfCount === 1 ? 'bezerro' : 'bezerros'}
        </Text>
      </View>
      <View style={styles.cardBadgesRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {REPRODUCTIVE_STATUS_LABELS[cow.reproductiveStatus]}
          </Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{COW_CATEGORY_LABELS[cow.category]}</Text>
        </View>
      </View>
    </Card>
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
    listContent: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      flexGrow: 1,
    },
    headerContent: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    attentionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    rowPressed: {
      opacity: 0.8,
    },
    attentionBannerText: {
      ...typography.bodyMedium,
      color: colors.danger,
      flex: 1,
    },
    attentionBannerChevron: {
      ...typography.heading,
      color: colors.danger,
    },
    financialCard: {
      gap: spacing.sm,
    },
    financialTitle: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    financialRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    financialCell: {
      flex: 1,
      gap: 2,
    },
    financialLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    financialValue: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    financialDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    linksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    link: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    linkDivider: {
      color: colors.textMuted,
    },
    card: {
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    cardStat: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    cardBadgesRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    statusBadgeText: {
      ...typography.captionMedium,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    categoryBadgeText: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    headerLinks: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    headerLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
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
  });
}
