import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { PhotoPicker } from '../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { useGrainBuyers } from '../../../../../../src/hooks/useGrainBuyers';
import { useGrainSales } from '../../../../../../src/hooks/useGrainSales';
import { useT } from '../../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

export default function NewSaleScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, seasonId, harvestEntryId, quantity: prefillQuantity, truckPlate: prefillTruckPlate } = useLocalSearchParams<{
    farmId: string;
    seasonId: string;
    harvestEntryId?: string;
    quantity?: string;
    truckPlate?: string;
  }>();
  const { buyers, createBuyer } = useGrainBuyers(farmId);
  const { createSale } = useGrainSales(seasonId);

  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [quantity, setQuantity] = useState(prefillQuantity ?? '');
  const [pricePerSaca, setPricePerSaca] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [truckPlate, setTruckPlate] = useState(prefillTruckPlate ?? '');
  const [carrierName, setCarrierName] = useState('');
  const [freightCost, setFreightCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleSubmit() {
    const quantityValue = Number(quantity.replace(',', '.'));
    const priceValue = Number(pricePerSaca.replace(',', '.'));
    if (!quantityValue || quantityValue <= 0 || !priceValue || priceValue <= 0) {
      setError(t('newSale.validationError'));
      return;
    }
    const freightValue = freightCost.trim() ? Number(freightCost.replace(',', '.')) : undefined;

    setIsSubmitting(true);
    const { error: createError } = await createSale({
      buyer_id: buyerId ?? undefined,
      quantity_sacas: quantityValue,
      price_per_saca: priceValue,
      notes: notes.trim() || undefined,
      photo_url: photoUrl ?? undefined,
      truck_plate: truckPlate.trim() || undefined,
      carrier_name: carrierName.trim() || undefined,
      freight_cost: freightValue,
      harvest_entry_id: harvestEntryId || undefined,
    });
    setIsSubmitting(false);

    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  const grossTotal = (Number(quantity.replace(',', '.')) || 0) * (Number(pricePerSaca.replace(',', '.')) || 0);
  const freightValue = Number(freightCost.replace(',', '.')) || 0;
  const netTotal = grossTotal - freightValue;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('newSale.title')} subtitle={t('newSale.subtitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {harvestEntryId ? <Text style={styles.linkedBanner}>{t('newSale.linkedBanner')}</Text> : null}

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

          <TextField label={t('newSale.quantityLabel')} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder={t('newSale.quantityPlaceholder')} />
          <TextField label={t('newSale.priceLabel')} value={pricePerSaca} onChangeText={setPricePerSaca} keyboardType="decimal-pad" placeholder={t('newSale.pricePlaceholder')} />
          {grossTotal > 0 ? (
            <Text style={styles.totalPreview}>{t('newSale.grossPreview', { value: formatCurrency(grossTotal) })}</Text>
          ) : null}

          <Card style={styles.transportCard}>
            <Text style={styles.transportTitle}>{t('newSale.transportTitle')}</Text>
            <Text style={styles.transportSubtitle}>{t('newSale.transportSubtitle')}</Text>
            <TextField label={t('newSale.truckPlateLabel')} value={truckPlate} onChangeText={setTruckPlate} placeholder={t('newSale.truckPlatePlaceholder')} autoCapitalize="characters" />
            <TextField label={t('newSale.carrierLabel')} value={carrierName} onChangeText={setCarrierName} placeholder={t('newSale.carrierPlaceholder')} />
            <TextField label={t('newSale.freightLabel')} value={freightCost} onChangeText={setFreightCost} keyboardType="decimal-pad" placeholder={t('newSale.freightPlaceholder')} />
            {freightValue > 0 ? (
              <Text style={styles.netPreview}>{t('newSale.netPreview', { value: formatCurrency(netTotal) })}</Text>
            ) : null}
          </Card>

          <TextField label={t('newSale.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('newSale.notesPlaceholder')} />
          <PhotoPicker
            label={t('newSale.photoLabel')}
            photoUrl={photoUrl}
            onChange={setPhotoUrl}
            folder="grain-sales"
            accentColor={colors.lavoura}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('newSale.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!quantity || !pricePerSaca} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
    flex: {
      flex: 1,
    },
    form: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    linkedBanner: {
      ...typography.captionMedium,
      color: colors.lavoura,
      backgroundColor: colors.lavouraLight,
      borderRadius: radius.sm,
      padding: spacing.md,
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
    transportCard: {
      gap: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.pecuariaLight,
    },
    transportTitle: {
      ...typography.subheading,
      color: colors.pecuaria,
    },
    transportSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.sm,
    },
    netPreview: {
      ...typography.bodyMedium,
      color: colors.pecuaria,
    },
    error: {
      color: colors.danger,
    },
  });
}
