import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../../src/components/FadeSlideIn';
import { PhotoPicker } from '../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { useGrainSales } from '../../../../../../src/hooks/useGrainSales';
import { useHarvestEntries } from '../../../../../../src/hooks/useHarvestEntries';
import { useT } from '../../../../../../src/i18n';
import { DEFAULT_KG_PER_SACA, calcSacasFromWeight } from '../../../../../../src/lib/harvestWeight';
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
              entries.map((entry) => {
                const transportInfo = [entry.driver_name, entry.truck_plate].filter(Boolean).join(' · ');
                return (
                  <Card key={entry.id} style={styles.rowCard}>
                    <View style={styles.rowTopRow}>
                      {entry.photo_url ? <Image source={{ uri: entry.photo_url }} style={styles.rowThumbnail} /> : null}
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.rowValue}>{Number(entry.quantity_sacas).toLocaleString('pt-BR')} sc</Text>
                          <Text style={styles.rowDate}>{formatDate(entry.harvested_at)}</Text>
                        </View>
                        {transportInfo ? <Text style={styles.rowTransport}>{t('harvest.entryTruckInfo', { info: transportInfo })}</Text> : null}
                        {entry.net_weight_kg !== null ? (
                          <Text style={styles.rowNotes}>
                            {t('harvest.entryWeightInfo', {
                              net: Number(entry.net_weight_kg).toLocaleString('pt-BR'),
                              kgPerSaca: String(entry.kg_per_saca ?? DEFAULT_KG_PER_SACA),
                            })}
                          </Text>
                        ) : null}
                        {entry.notes ? <Text style={styles.rowNotes}>{entry.notes}</Text> : null}
                      </View>
                    </View>
                  </Card>
                );
              })
            )}

            {isAdding ? (
              <NewHarvestForm
                t={t}
                styles={styles}
                colors={colors}
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

interface HarvestFormValues {
  quantity_sacas: number;
  notes?: string;
  truck_plate?: string;
  driver_name?: string;
  gross_weight_kg?: number;
  net_weight_kg?: number;
  kg_per_saca?: number;
  photo_url?: string;
}

function NewHarvestForm({
  onCancel,
  onCreate,
  t,
  styles,
  colors,
}: {
  onCancel: () => void;
  onCreate: (values: HarvestFormValues) => Promise<string | null>;
  t: ReturnType<typeof useT>;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  const [truckPlate, setTruckPlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [kgPerSaca, setKgPerSaca] = useState(String(DEFAULT_KG_PER_SACA));
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const netWeightNum = Number(netWeight.replace(',', '.')) || 0;
  const kgPerSacaNum = Number(kgPerSaca.replace(',', '.')) || DEFAULT_KG_PER_SACA;
  const computedSacas = calcSacasFromWeight(netWeightNum, kgPerSacaNum);

  async function handleSubmit() {
    const manualValue = Number(quantity.replace(',', '.'));
    const finalQuantity = manualValue > 0 ? manualValue : computedSacas;
    if (!finalQuantity || finalQuantity <= 0) {
      setError(t('harvest.validationError'));
      return;
    }

    setIsSubmitting(true);
    const grossWeightNum = Number(grossWeight.replace(',', '.'));
    const createError = await onCreate({
      quantity_sacas: finalQuantity,
      notes: notes.trim() || undefined,
      truck_plate: truckPlate.trim() || undefined,
      driver_name: driverName.trim() || undefined,
      gross_weight_kg: grossWeightNum > 0 ? grossWeightNum : undefined,
      net_weight_kg: netWeightNum > 0 ? netWeightNum : undefined,
      kg_per_saca: netWeightNum > 0 ? kgPerSacaNum : undefined,
      photo_url: photoUrl ?? undefined,
    });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <Card style={styles.truckCard}>
        <Text style={styles.truckTitle}>{t('harvest.truckSectionTitle')}</Text>
        <Text style={styles.truckSubtitle}>{t('harvest.truckSectionSubtitle')}</Text>
        <TextField label={t('harvest.truckPlateLabel')} value={truckPlate} onChangeText={setTruckPlate} placeholder={t('harvest.truckPlatePlaceholder')} autoCapitalize="characters" />
        <TextField label={t('harvest.driverLabel')} value={driverName} onChangeText={setDriverName} placeholder={t('harvest.driverPlaceholder')} />
        <TextField label={t('harvest.grossWeightLabel')} value={grossWeight} onChangeText={setGrossWeight} keyboardType="decimal-pad" placeholder={t('harvest.grossWeightPlaceholder')} />
        <TextField label={t('harvest.netWeightLabel')} value={netWeight} onChangeText={setNetWeight} keyboardType="decimal-pad" placeholder={t('harvest.netWeightPlaceholder')} />
        {netWeightNum > 0 ? (
          <>
            <TextField label={t('harvest.kgPerSacaLabel')} value={kgPerSaca} onChangeText={setKgPerSaca} keyboardType="decimal-pad" />
            <Text style={styles.truckHelp}>{t('harvest.kgPerSacaHelp')}</Text>
            {computedSacas !== null ? (
              <Pressable style={styles.computedRow} onPress={() => setQuantity(String(computedSacas))}>
                <Text style={styles.computedText}>{t('harvest.computedSacas', { sacas: computedSacas.toLocaleString('pt-BR') })}</Text>
                <Text style={styles.computedLink}>{t('harvest.useComputedValue')}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
        <PhotoPicker label={t('harvest.photoLabel')} photoUrl={photoUrl} onChange={setPhotoUrl} folder="harvest-entries" accentColor={colors.lavoura} />
      </Card>

      <TextField label={t('harvest.quantityLabel')} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder={t('harvest.quantityPlaceholder')} />
      <TextField label={t('harvest.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('harvest.notesPlaceholder')} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label={t('harvest.cancel')} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={t('harvest.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!quantity && computedSacas === null} style={{ flex: 1 }} />
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
    rowTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    rowThumbnail: {
      width: 48,
      height: 48,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceAlt,
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
    rowTransport: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    form: {
      gap: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    truckCard: {
      gap: spacing.md,
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
    },
    truckTitle: {
      ...typography.subheading,
      color: colors.pecuaria,
    },
    truckSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
    },
    truckHelp: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: -spacing.sm,
    },
    computedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    computedText: {
      ...typography.bodyMedium,
      color: colors.pecuaria,
    },
    computedLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
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
