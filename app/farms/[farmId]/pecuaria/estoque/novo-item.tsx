import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { ChipSelect } from '../../../../../src/components/ChipSelect';
import { FadeSlideIn } from '../../../../../src/components/FadeSlideIn';
import { PhotoPicker } from '../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { CATTLE_INVENTORY_CATEGORY_OPTIONS, CATTLE_INVENTORY_UNIT_OPTIONS } from '../../../../../src/data/cattleOptions';
import { useCattleInventoryItems } from '../../../../../src/hooks/useCattleInventory';
import { useSuppliers } from '../../../../../src/hooks/useSuppliers';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';
import type { CattleInventoryCategory, CattleInventoryUnit } from '../../../../../src/types/database';

/** Converte "DD/MM/AAAA" em "AAAA-MM-DD" (formato de data do Postgres). */
function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export default function NewInventoryItemScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createItem } = useCattleInventoryItems(farmId);
  const { suppliers } = useSuppliers(farmId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<CattleInventoryCategory>('racao');
  const [unit, setUnit] = useState<CattleInventoryUnit>('kg');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Informe o nome do item.');
      return;
    }
    setIsSubmitting(true);
    const { error: createError } = await createItem({
      name: name.trim(),
      category,
      unit,
      initial_quantity: initialQuantity ? Number(initialQuantity.replace(',', '.')) : undefined,
      min_quantity: minQuantity ? Number(minQuantity.replace(',', '.')) : undefined,
      unit_cost: unitCost ? Number(unitCost.replace(',', '.')) : undefined,
      supplier_id: supplierId ?? undefined,
      expiration_date: parseDate(expirationDate) ?? undefined,
      location: location.trim() || undefined,
      photo_url: photoUrl ?? undefined,
    });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Novo item de estoque" subtitle="Ração, núcleo mineral, medicamento veterinário" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Dados do item</Text>
              <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Ração 20% PB" />
              <ChipSelect label="Categoria" options={CATTLE_INVENTORY_CATEGORY_OPTIONS} value={category} onChange={setCategory} accentColor={colors.pecuaria} />
              <ChipSelect label="Unidade" options={CATTLE_INVENTORY_UNIT_OPTIONS} value={unit} onChange={setUnit} accentColor={colors.pecuaria} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TextField label="Estoque inicial" value={initialQuantity} onChangeText={setInitialQuantity} placeholder="Ex.: 500" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label="Estoque mínimo" value={minQuantity} onChangeText={setMinQuantity} placeholder="Opcional" keyboardType="decimal-pad" />
                </View>
              </View>
              <TextField label="Custo por unidade (R$)" value={unitCost} onChangeText={setUnitCost} placeholder="Opcional" keyboardType="decimal-pad" />
            </Card>
          </FadeSlideIn>

          <FadeSlideIn delay={80}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Detalhes</Text>
              <Text style={styles.help}>Tudo opcional — ajuda a controlar validade, onde tá guardado e de onde comprar de novo.</Text>
              {suppliers.length > 0 ? (
                <ChipSelect
                  label="Fornecedor"
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                  value={supplierId}
                  onChange={setSupplierId}
                  accentColor={colors.pecuaria}
                />
              ) : null}
              <TextField label="Validade" value={expirationDate} onChangeText={setExpirationDate} placeholder="DD/MM/AAAA (opcional)" keyboardType="numbers-and-punctuation" />
              <TextField label="Onde fica guardado" value={location} onChangeText={setLocation} placeholder="Ex.: Galpão 2" />
              <PhotoPicker label="Foto do item" photoUrl={photoUrl} onChange={setPhotoUrl} folder="cattle-inventory" accentColor={colors.pecuaria} />
            </Card>
          </FadeSlideIn>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar item" onPress={handleSubmit} loading={isSubmitting} disabled={!name} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    card: {
      gap: spacing.md,
      backgroundColor: colors.pecuariaLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.pecuaria,
    },
    help: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: -spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    error: {
      color: colors.danger,
    },
  });
}
