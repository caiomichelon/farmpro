import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useSuppliers } from '../../../src/hooks/useSuppliers';
import type { Supplier } from '../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

const CATEGORY_OPTIONS: { value: Supplier['category']; label: string }[] = [
  { value: 'agropecuaria', label: 'Agropecuária' },
  { value: 'veterinario', label: 'Veterinário' },
  { value: 'mecanico', label: 'Mecânico' },
  { value: 'transportadora', label: 'Transportadora' },
  { value: 'comprador', label: 'Comprador' },
  { value: 'outro', label: 'Outro' },
];

export default function SuppliersScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { suppliers, isLoading, error, createSupplier, deleteSupplier } = useSuppliers(farmId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Supplier['category']>('agropecuaria');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    setFormError(null);
    setIsSaving(true);
    const { error: createError } = await createSupplier({ name, category, phone, notes });
    setIsSaving(false);
    if (createError) {
      setFormError(createError);
      return;
    }
    setName('');
    setCategory('agropecuaria');
    setPhone('');
    setNotes('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="📇 Fornecedores" subtitle={`${suppliers.length} ${suppliers.length === 1 ? 'contato' : 'contatos'}`} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Novo contato</Text>
            <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Agropecuária São José" />
            <ChipSelect label="Categoria" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            <TextField label="Telefone (opcional)" value={phone} onChangeText={setPhone} placeholder="Ex.: (11) 98765-4321" keyboardType="phone-pad" />
            <TextField label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Ex.: entrega às terças" />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <Button label={isSaving ? 'Salvando...' : 'Salvar'} onPress={handleSave} disabled={isSaving} />
          </Card>

          <Text style={styles.sectionTitle}>Contatos</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : suppliers.length === 0 ? (
            <EmptyState text="Nenhum fornecedor cadastrado ainda." />
          ) : (
            suppliers.map((supplier) => (
              <SupplierRow key={supplier.id} supplier={supplier} colors={colors} styles={styles} onDelete={() => deleteSupplier(supplier.id)} />
            ))
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SupplierRow({
  supplier,
  colors,
  styles,
  onDelete,
}: {
  supplier: Supplier;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
  onDelete: () => void;
}) {
  const categoryLabel = CATEGORY_OPTIONS.find((o) => o.value === supplier.category)?.label ?? supplier.category;

  return (
    <Card style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.supplierName}>{supplier.name}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteLink}>Excluir</Text>
        </Pressable>
      </View>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
      </View>
      {supplier.phone ? (
        <Pressable onPress={() => Linking.openURL(`tel:${supplier.phone}`)} hitSlop={4}>
          <Text style={[styles.phoneText, { color: colors.primary }]}>📞 {supplier.phone}</Text>
        </Pressable>
      ) : null}
      {supplier.notes ? <Text style={styles.notesText}>{supplier.notes}</Text> : null}
    </Card>
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
      gap: spacing.md,
    },
    formCard: {
      gap: spacing.md,
      borderRadius: radius.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
    loading: {
      marginTop: spacing.lg,
    },
    rowCard: {
      gap: spacing.xs,
      borderRadius: radius.md,
    },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    supplierName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    deleteLink: {
      ...typography.caption,
      color: colors.danger,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    categoryBadgeText: {
      ...typography.captionMedium,
      color: colors.primary,
    },
    phoneText: {
      ...typography.bodyMedium,
    },
    notesText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
