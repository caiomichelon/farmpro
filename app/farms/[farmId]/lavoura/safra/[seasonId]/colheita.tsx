import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../../src/components/FadeSlideIn';
import { PhotoPicker } from '../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { useGrainBuyers } from '../../../../../../src/hooks/useGrainBuyers';
import { useGrainSales } from '../../../../../../src/hooks/useGrainSales';
import { useHarvestEntries } from '../../../../../../src/hooks/useHarvestEntries';
import { useT } from '../../../../../../src/i18n';
import { DEFAULT_KG_PER_SACA, calcSacasFromWeight } from '../../../../../../src/lib/harvestWeight';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';
import type { GrainBuyer } from '../../../../../../src/types/database';

export default function HarvestScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  const { entries, totalSacas, daysHarvesting, isLoading, error, createEntry, reload: reloadEntries } = useHarvestEntries(seasonId);
  const { sales, totalSacasSold, totalValue, createSale, reload: reloadSales } = useGrainSales(seasonId);
  const { buyers, createBuyer } = useGrainBuyers(farmId);
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

  const salesByHarvestEntry = useMemo(() => {
    const map = new Map<string, (typeof sales)[number]>();
    for (const sale of sales) {
      if (sale.harvest_entry_id) map.set(sale.harvest_entry_id, sale);
    }
    return map;
  }, [sales]);

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
                const linkedSale = salesByHarvestEntry.get(entry.id);
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
                        {linkedSale ? (
                          <Text style={styles.rowSold}>
                            {t('harvest.entrySold')} — {t('harvest.entrySaleInfo', {
                              buyer: linkedSale.buyerName ?? t('sales.buyerUnknown'),
                              price: Number(linkedSale.price_per_saca).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                            })}
                          </Text>
                        ) : (
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: `/farms/${farmId}/lavoura/safra/${seasonId}/nova-venda`,
                                params: {
                                  harvestEntryId: entry.id,
                                  quantity: String(entry.quantity_sacas),
                                  truckPlate: entry.truck_plate ?? '',
                                },
                              })
                            }
                          >
                            <Text style={styles.linkSale}>{t('harvest.entryUnsold')} — {t('harvest.linkSale')}</Text>
                          </Pressable>
                        )}
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
                buyers={buyers}
                createBuyer={createBuyer}
                createEntry={createEntry}
                createSale={createSale}
                onClose={() => setIsAdding(false)}
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
  onClose,
  createEntry,
  createSale,
  buyers,
  createBuyer,
  t,
  styles,
  colors,
}: {
  onClose: () => void;
  createEntry: (values: HarvestFormValues) => Promise<{ error: string | null; id: string | null }>;
  createSale: ReturnType<typeof useGrainSales>['createSale'];
  buyers: GrainBuyer[];
  createBuyer: ReturnType<typeof useGrainBuyers>['createBuyer'];
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

  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [pricePerSaca, setPricePerSaca] = useState('');
  const [freightCost, setFreightCost] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const netWeightNum = Number(netWeight.replace(',', '.')) || 0;
  const kgPerSacaNum = Number(kgPerSaca.replace(',', '.')) || DEFAULT_KG_PER_SACA;
  const computedSacas = calcSacasFromWeight(netWeightNum, kgPerSacaNum);
  const manualValue = Number(quantity.replace(',', '.'));
  const finalQuantity = manualValue > 0 ? manualValue : computedSacas;

  const priceValue = Number(pricePerSaca.replace(',', '.')) || 0;
  const freightValue = Number(freightCost.replace(',', '.')) || 0;
  const grossTotal = (finalQuantity ?? 0) * priceValue;
  const netTotal = grossTotal - freightValue;

  function resetFields() {
    setTruckPlate('');
    setDriverName('');
    setGrossWeight('');
    setNetWeight('');
    setKgPerSaca(String(DEFAULT_KG_PER_SACA));
    setPhotoUrl(null);
    setQuantity('');
    setNotes('');
    setBuyerId(null);
    setPricePerSaca('');
    setFreightCost('');
  }

  async function handleAddBuyer() {
    if (!newBuyerName.trim()) return;
    const { error: createError, id } = await createBuyer({ name: newBuyerName.trim() });
    if (createError) {
      setError(createError);
      return;
    }
    if (id) setBuyerId(id);
    setNewBuyerName('');
    setIsAddingBuyer(false);
  }

  async function handleSubmit(closeAfter: boolean) {
    if (!finalQuantity || finalQuantity <= 0) {
      setError(t('harvest.validationError'));
      return;
    }
    if (pricePerSaca.trim() && priceValue <= 0) {
      setError(t('newSale.validationError'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const grossWeightNum = Number(grossWeight.replace(',', '.'));
    const { error: entryError, id: entryId } = await createEntry({
      quantity_sacas: finalQuantity,
      notes: notes.trim() || undefined,
      truck_plate: truckPlate.trim() || undefined,
      driver_name: driverName.trim() || undefined,
      gross_weight_kg: grossWeightNum > 0 ? grossWeightNum : undefined,
      net_weight_kg: netWeightNum > 0 ? netWeightNum : undefined,
      kg_per_saca: netWeightNum > 0 ? kgPerSacaNum : undefined,
      photo_url: photoUrl ?? undefined,
    });

    if (entryError || !entryId) {
      setError(entryError ?? t('harvest.validationError'));
      setIsSubmitting(false);
      return;
    }

    if (priceValue > 0) {
      const { error: saleError } = await createSale({
        buyer_id: buyerId ?? undefined,
        quantity_sacas: finalQuantity,
        price_per_saca: priceValue,
        freight_cost: freightValue > 0 ? freightValue : undefined,
        truck_plate: truckPlate.trim() || undefined,
        harvest_entry_id: entryId,
      });
      if (saleError) {
        setError(saleError);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    if (closeAfter) {
      onClose();
    } else {
      setSavedCount((c) => c + 1);
      resetFields();
    }
  }

  return (
    <View style={styles.form}>
      {savedCount > 0 ? <Text style={styles.savedBanner}>{t('harvest.savedCount', { count: String(savedCount) })}</Text> : null}

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

      <Card style={styles.saleCard}>
        <Text style={styles.saleTitle}>{t('harvest.saleSectionTitle')}</Text>
        <Text style={styles.saleSubtitle}>{t('harvest.saleSectionSubtitle')}</Text>
        <ChipSelect
          label={t('newSale.buyerLabel')}
          options={buyers.map((b) => ({ value: b.id, label: b.name }))}
          value={buyerId}
          onChange={setBuyerId}
          accentColor={colors.lavoura}
        />
        {isAddingBuyer ? (
          <View style={styles.inlineRow}>
            <View style={{ flex: 1 }}>
              <TextField label={t('newSale.newBuyerLabel')} value={newBuyerName} onChangeText={setNewBuyerName} placeholder={t('newSale.newBuyerPlaceholder')} />
            </View>
            <Button label={t('newSale.addBuyer')} onPress={handleAddBuyer} disabled={!newBuyerName.trim()} />
          </View>
        ) : (
          <Button label={t('newSale.addBuyerButton')} variant="ghost" onPress={() => setIsAddingBuyer(true)} />
        )}
        <TextField label={t('newSale.priceLabel')} value={pricePerSaca} onChangeText={setPricePerSaca} keyboardType="decimal-pad" placeholder={t('newSale.pricePlaceholder')} />
        <TextField label={t('newSale.freightLabel')} value={freightCost} onChangeText={setFreightCost} keyboardType="decimal-pad" placeholder={t('newSale.freightPlaceholder')} />
        {grossTotal > 0 ? <Text style={styles.totalPreview}>{t('newSale.grossPreview', { value: formatCurrency(grossTotal) })}</Text> : null}
        {freightValue > 0 ? <Text style={styles.netPreview}>{t('newSale.netPreview', { value: formatCurrency(netTotal) })}</Text> : null}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label={t('harvest.cancel')} variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Button
          label={t('harvest.saveAndAddAnother')}
          variant="secondary"
          onPress={() => handleSubmit(false)}
          loading={isSubmitting}
          disabled={!finalQuantity}
          style={{ flex: 1 }}
        />
      </View>
      <Button label={t('harvest.saveAndFinish')} onPress={() => handleSubmit(true)} loading={isSubmitting} disabled={!finalQuantity} />
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    rowSold: {
      ...typography.captionMedium,
      color: colors.lavoura,
      marginTop: 2,
    },
    linkSale: {
      ...typography.captionMedium,
      color: colors.textMuted,
      marginTop: 2,
      textDecorationLine: 'underline',
    },
    form: {
      gap: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    savedBanner: {
      ...typography.captionMedium,
      color: colors.lavoura,
      backgroundColor: colors.lavouraLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
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
    saleCard: {
      gap: spacing.md,
      backgroundColor: colors.lavouraLight,
      borderRadius: radius.md,
    },
    saleTitle: {
      ...typography.subheading,
      color: colors.lavoura,
    },
    saleSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.md,
    },
    totalPreview: {
      ...typography.bodyMedium,
      color: colors.lavoura,
    },
    netPreview: {
      ...typography.bodyMedium,
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
