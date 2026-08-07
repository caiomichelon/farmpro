import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { useSlaughterhouses, useSlaughterhouseRanking, type SlaughterhouseRanking } from '../../../../../../src/hooks/useSlaughterhouses';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

export default function SlaughterhousesScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { slaughterhouses, isLoading, error, createSlaughterhouse } = useSlaughterhouses(farmId);
  const { ranking, isLoading: isLoadingRanking } = useSlaughterhouseRanking(farmId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Frigoríficos" subtitle="Compradores de gado de corte" />

      <ScrollView contentContainerStyle={styles.content}>
        {ranking.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Melhor comprador (preço médio por arroba)</Text>
            {isLoadingRanking ? (
              <ActivityIndicator color={colors.pecuaria} />
            ) : (
              ranking.map((entry, index) => <RankingRow key={entry.slaughterhouseId} entry={entry} rank={index + 1} />)
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Todos os frigoríficos</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.pecuaria} />
          ) : slaughterhouses.length === 0 ? (
            <EmptyState text="Nenhum frigorífico cadastrado ainda." />
          ) : (
            slaughterhouses.map((house) => (
              <Card key={house.id} style={styles.houseCard}>
                <Text style={styles.houseName}>{house.name}</Text>
                {house.notes ? <Text style={styles.houseNotes}>{house.notes}</Text> : null}
              </Card>
            ))
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isAdding ? (
            <NewHouseForm
              onCancel={() => setIsAdding(false)}
              onCreate={async (values) => {
                const { error: createError } = await createSlaughterhouse(values);
                if (!createError) setIsAdding(false);
                return createError;
              }}
            />
          ) : (
            <Button label="+ Novo frigorífico" variant="secondary" onPress={() => setIsAdding(true)} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RankingRow({ entry, rank }: { entry: SlaughterhouseRanking; rank: number }) {
  return (
    <Card style={styles.rankingCard}>
      <View style={styles.rankingTopRow}>
        <View style={styles.rankingBadge}>
          <Text style={styles.rankingBadgeText}>{rank}º</Text>
        </View>
        <Text style={styles.houseName}>{entry.slaughterhouseName}</Text>
        <Text style={styles.rankingPrice}>
          {entry.averagePricePerArroba.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/@
        </Text>
      </View>
      <Text style={styles.rankingMeta}>
        {entry.totalHead.toLocaleString('pt-BR')} cabeças · {entry.eventCount}{' '}
        {entry.eventCount === 1 ? 'abate' : 'abates'} ·{' '}
        {entry.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no total
      </Text>
      {entry.nextSlaughterDate ? (
        <Text style={styles.rankingMeta}>Próximo abate agendado: {formatDate(entry.nextSlaughterDate)}</Text>
      ) : null}
    </Card>
  );
}

function NewHouseForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: { name: string; notes?: string }) => Promise<string | null>;
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
      <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Frigorífico Rio Verde" />
      <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!name} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.pecuariaLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingBadgeText: {
    ...typography.captionMedium,
    color: colors.pecuaria,
  },
  rankingPrice: {
    ...typography.bodyMedium,
    color: colors.pecuaria,
    marginLeft: 'auto',
  },
  rankingMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  houseCard: {
    marginBottom: spacing.sm,
  },
  houseName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  houseNotes: {
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
