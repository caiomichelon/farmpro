import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useBuyerRanking, useGrainBuyers, type BuyerRanking } from '../../../../../src/hooks/useGrainBuyers';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

export default function BuyersScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { buyers, isLoading, error, createBuyer, reload } = useGrainBuyers(farmId);
  const { ranking, isLoading: isLoadingRanking, reload: reloadRanking } = useBuyerRanking(farmId);
  const [isAdding, setIsAdding] = useState(false);

  // O ranking muda quando uma venda é lançada lá na safra (rota separada).
  useFocusEffect(
    useCallback(() => {
      reload();
      reloadRanking();
    }, [reload, reloadRanking])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Compradores de grão" subtitle="Tradings e cerealistas" />

      <ScrollView contentContainerStyle={styles.content}>
        {ranking.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Melhor comprador (preço médio por saca)</Text>
            {isLoadingRanking ? (
              <ActivityIndicator color={colors.lavoura} />
            ) : (
              ranking.map((entry, index) => <RankingRow key={entry.buyerId} entry={entry} rank={index + 1} styles={styles} />)
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Todos os compradores</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.lavoura} />
          ) : buyers.length === 0 ? (
            <EmptyState text="Nenhum comprador cadastrado ainda." />
          ) : (
            buyers.map((buyer) => (
              <Card key={buyer.id} style={styles.buyerCard}>
                <Text style={styles.buyerName}>{buyer.name}</Text>
                {buyer.notes ? <Text style={styles.buyerNotes}>{buyer.notes}</Text> : null}
              </Card>
            ))
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isAdding ? (
            <NewBuyerForm
              styles={styles}
              onCancel={() => setIsAdding(false)}
              onCreate={async (values) => {
                const { error: createError } = await createBuyer(values);
                if (!createError) setIsAdding(false);
                return createError;
              }}
            />
          ) : (
            <Button label="+ Novo comprador" variant="secondary" onPress={() => setIsAdding(true)} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RankingRow({ entry, rank, styles }: { entry: BuyerRanking; rank: number; styles: ReturnType<typeof createStyles> }) {
  return (
    <Card style={styles.rankingCard}>
      <View style={styles.rankingTopRow}>
        <View style={styles.rankingBadge}>
          <Text style={styles.rankingBadgeText}>{rank}º</Text>
        </View>
        <Text style={styles.buyerName}>{entry.buyerName}</Text>
        <Text style={styles.rankingPrice}>
          {entry.averagePricePerSaca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/sc
        </Text>
      </View>
      <Text style={styles.rankingMeta}>
        {entry.totalSacas.toLocaleString('pt-BR')} sc compradas · {entry.saleCount}{' '}
        {entry.saleCount === 1 ? 'venda' : 'vendas'} ·{' '}
        {entry.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no total
      </Text>
    </Card>
  );
}

function NewBuyerForm({
  onCancel,
  onCreate,
  styles,
}: {
  onCancel: () => void;
  onCreate: (values: { name: string; notes?: string }) => Promise<string | null>;
  styles: ReturnType<typeof createStyles>;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const createError = await onCreate({ name: name.trim(), notes: notes.trim() || undefined });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Trading Boa Safra" />
      <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!name} style={{ flex: 1 }} />
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
    rankingCard: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    rankingTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    rankingBadge: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: colors.lavouraLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankingBadgeText: {
      ...typography.captionMedium,
      color: colors.lavoura,
    },
    rankingPrice: {
      ...typography.bodyMedium,
      color: colors.lavoura,
      marginLeft: 'auto',
    },
    rankingMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    buyerCard: {
      marginBottom: spacing.sm,
    },
    buyerName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
      flex: 1,
    },
    buyerNotes: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    form: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    error: {
      color: colors.danger,
    },
  });
}
