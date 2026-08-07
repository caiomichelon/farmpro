import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { useGrainSales } from '../../../../../../src/hooks/useGrainSales';
import { useHarvestEntries } from '../../../../../../src/hooks/useHarvestEntries';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

export default function HarvestScreen() {
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  const { entries, totalSacas, daysHarvesting, isLoading, error, createEntry } = useHarvestEntries(seasonId);
  const { sales, totalSacasSold, totalValue, isLoading: isLoadingSales } = useGrainSales(seasonId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Colheita" subtitle={`${totalSacas.toLocaleString('pt-BR')} sc colhidas · ${daysHarvesting} dias`} />

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Lançamentos de colheita">
          {isLoading ? (
            <ActivityIndicator color={colors.lavoura} />
          ) : entries.length === 0 ? (
            <EmptyState text="Nenhuma colheita lançada ainda." />
          ) : (
            entries.map((entry) => (
              <Card key={entry.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{Number(entry.quantity_sacas).toLocaleString('pt-BR')} sc</Text>
                  <Text style={styles.rowDate}>{formatDate(entry.harvested_at)}</Text>
                </View>
                {entry.notes ? <Text style={styles.rowNotes}>{entry.notes}</Text> : null}
              </Card>
            ))
          )}

          {isAdding ? (
            <NewHarvestForm
              onCancel={() => setIsAdding(false)}
              onCreate={async (values) => {
                const { error: createError } = await createEntry(values);
                if (!createError) setIsAdding(false);
                return createError;
              }}
            />
          ) : (
            <Button label="+ Lançar colheita do dia" variant="secondary" onPress={() => setIsAdding(true)} />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Section>

        <Section title="Vendas" subtitle={`${totalSacasSold.toLocaleString('pt-BR')} sc vendidas · ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}>
          {isLoadingSales ? (
            <ActivityIndicator color={colors.lavoura} />
          ) : sales.length === 0 ? (
            <EmptyState text="Nenhuma venda lançada ainda." />
          ) : (
            sales.map((sale) => (
              <Card key={sale.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{sale.buyerName ?? 'Comprador não informado'}</Text>
                  <Text style={styles.rowDate}>{formatDate(sale.sale_date)}</Text>
                </View>
                <Text style={styles.rowNotes}>
                  {Number(sale.quantity_sacas).toLocaleString('pt-BR')} sc ·{' '}
                  {Number(sale.price_per_saca).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/sc ·{' '}
                  {(Number(sale.quantity_sacas) * Number(sale.price_per_saca)).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </Text>
              </Card>
            ))
          )}

          <Button
            label="+ Lançar venda"
            onPress={() => router.push(`/farms/${farmId}/lavoura/safra/${seasonId}/nova-venda`)}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function NewHarvestForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: { quantity_sacas: number; notes?: string }) => Promise<string | null>;
}) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const value = Number(quantity.replace(',', '.'));
    if (!value || value <= 0) {
      setError('Informe uma quantidade válida em sacas.');
      return;
    }
    setIsSubmitting(true);
    const createError = await onCreate({ quantity_sacas: value, notes: notes.trim() || undefined });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <TextField label="Sacas colhidas hoje" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Ex.: 850" />
      <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!quantity} style={{ flex: 1 }} />
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
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  sectionBody: {
    gap: spacing.md,
  },
  rowCard: {
    gap: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  rowDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowNotes: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
  },
});
