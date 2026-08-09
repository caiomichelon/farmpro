import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { useGrainSales } from '../../../../../../src/hooks/useGrainSales';
import { useHarvestEntries } from '../../../../../../src/hooks/useHarvestEntries';
import { useT } from '../../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

export default function HarvestScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  const { entries, totalSacas, daysHarvesting, isLoading, error, createEntry, reload: reloadEntries } = useHarvestEntries(seasonId);
  const { totalSacasSold, totalValue, reload: reloadSales } = useGrainSales(seasonId);
  const [isAdding, setIsAdding] = useState(false);

  // "Lançar colheita" e a tela de Vendas ficam em rotas separadas — refaz a
  // busca ao voltar pra cá, senão o lançamento recém-criado não aparece até
  // um refresh manual.
  useFocusEffect(
    useCallback(() => {
      reloadEntries();
      reloadSales();
    }, [reloadEntries, reloadSales])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('harvest.title')}
        subtitle={t('harvest.subtitle', { sacas: totalSacas.toLocaleString('pt-BR'), days: String(daysHarvesting) })}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <FadeSlideIn delay={40}>
          <Pressable
            style={({ pressed }) => [styles.salesRow, pressed && styles.salesRowPressed]}
            onPress={() => router.push(`/farms/${farmId}/lavoura/safra/${seasonId}/vendas`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.salesRowTitle}>{t('harvest.salesRowTitle')}</Text>
              <Text style={styles.salesRowSubtitle}>
                {t('harvest.salesRowSubtitle', {
                  sacas: totalSacasSold.toLocaleString('pt-BR'),
                  value: totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                })}
              </Text>
            </View>
            <Text style={styles.salesRowChevron}>→</Text>
          </Pressable>
        </FadeSlideIn>

        <FadeSlideIn delay={80}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('harvest.entriesTitle')}</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.lavoura} />
            ) : entries.length === 0 ? (
              <EmptyState text={t('harvest.entriesEmpty')} />
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
                t={t}
                styles={styles}
                onCancel={() => setIsAdding(false)}
                onCreate={async (values) => {
                  const { error: createError } = await createEntry(values);
                  if (!createError) setIsAdding(false);
                  return createError;
                }}
              />
            ) : (
              <Button label={t('harvest.newEntry')} variant="secondary" onPress={() => setIsAdding(true)} />
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </FadeSlideIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function NewHarvestForm({
  onCancel,
  onCreate,
  t,
  styles,
}: {
  onCancel: () => void;
  onCreate: (values: { quantity_sacas: number; notes?: string }) => Promise<string | null>;
  t: ReturnType<typeof useT>;
  styles: ReturnType<typeof createStyles>;
}) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const value = Number(quantity.replace(',', '.'));
    if (!value || value <= 0) {
      setError(t('harvest.validationError'));
      return;
    }
    setIsSubmitting(true);
    const createError = await onCreate({ quantity_sacas: value, notes: notes.trim() || undefined });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <TextField label={t('harvest.quantityLabel')} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder={t('harvest.quantityPlaceholder')} />
      <TextField label={t('harvest.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('harvest.notesPlaceholder')} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label={t('harvest.cancel')} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={t('harvest.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!quantity} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
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
      gap: spacing.xl,
    },
    salesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.lavouraLight,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    salesRowPressed: {
      opacity: 0.8,
    },
    salesRowTitle: {
      ...typography.subheading,
      color: colors.lavoura,
    },
    salesRowSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    salesRowChevron: {
      ...typography.heading,
      color: colors.lavoura,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
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
}
