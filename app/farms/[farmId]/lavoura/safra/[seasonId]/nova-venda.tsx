import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { PhotoPicker } from '../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { useGrainBuyers } from '../../../../../../src/hooks/useGrainBuyers';
import { useGrainSales } from '../../../../../../src/hooks/useGrainSales';
import { colors, spacing } from '../../../../../../src/theme';

export default function NewSaleScreen() {
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  const { buyers, createBuyer } = useGrainBuyers(farmId);
  const { createSale } = useGrainSales(seasonId);

  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerSaca, setPricePerSaca] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddBuyer() {
    if (!newBuyerName.trim()) return;
    const { error: createError } = await createBuyer({ name: newBuyerName.trim() });
    if (createError) {
      setError(createError);
      return;
    }
    setNewBuyerName('');
    setIsAddingBuyer(false);
  }

  async function handleSubmit() {
    const quantityValue = Number(quantity.replace(',', '.'));
    const priceValue = Number(pricePerSaca.replace(',', '.'));
    if (!quantityValue || quantityValue <= 0 || !priceValue || priceValue <= 0) {
      setError('Preencha a quantidade e o preço por saca.');
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createSale({
      buyer_id: buyerId ?? undefined,
      quantity_sacas: quantityValue,
      price_per_saca: priceValue,
      notes: notes.trim() || undefined,
      photo_url: photoUrl ?? undefined,
    });
    setIsSubmitting(false);

    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  const totalValue = (Number(quantity.replace(',', '.')) || 0) * (Number(pricePerSaca.replace(',', '.')) || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Lançar venda" subtitle="Detalhamento completo da venda da safra" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect
            label="Comprador"
            options={buyers.map((b) => ({ value: b.id, label: b.name }))}
            value={buyerId}
            onChange={setBuyerId}
            accentColor={colors.lavoura}
          />

          {isAddingBuyer ? (
            <View style={styles.inlineRow}>
              <View style={{ flex: 1 }}>
                <TextField label="Novo comprador" value={newBuyerName} onChangeText={setNewBuyerName} placeholder="Nome da trading/cerealista" />
              </View>
              <Button label="Adicionar" onPress={handleAddBuyer} disabled={!newBuyerName.trim()} />
            </View>
          ) : (
            <Button label="+ Novo comprador" variant="ghost" onPress={() => setIsAddingBuyer(true)} />
          )}

          <TextField label="Quantidade (sacas)" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Ex.: 500" />
          <TextField label="Preço pago por saca" value={pricePerSaca} onChangeText={setPricePerSaca} keyboardType="decimal-pad" placeholder="R$" />
          {totalValue > 0 ? (
            <Text style={styles.totalPreview}>
              Total: {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          ) : null}
          <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
          <PhotoPicker
            label="Foto da nota (opcional)"
            photoUrl={photoUrl}
            onChange={setPhotoUrl}
            folder="grain-sales"
            accentColor={colors.lavoura}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar venda" onPress={handleSubmit} loading={isSubmitting} disabled={!quantity || !pricePerSaca} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  totalPreview: {
    color: colors.lavoura,
  },
  error: {
    color: colors.danger,
  },
});
