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
import { useT, type TFunction } from '../../../src/i18n';
import type { Supplier } from '../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function categoryOptions(t: TFunction): { value: Supplier['category']; label: string }[] {
  return [
    { value: 'agropecuaria', label: t('suppliers.categoryAgropecuaria') },
    { value: 'veterinario', label: t('suppliers.categoryVeterinario') },
    { value: 'mecanico', label: t('suppliers.categoryMecanico') },
    { value: 'transportadora', label: t('suppliers.categoryTransportadora') },
    { value: 'comprador', label: t('suppliers.categoryComprador') },
    { value: 'outro', label: t('suppliers.categoryOutro') },
  ];
}

export default function SuppliersScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const categoryOpts = useMemo(() => categoryOptions(t), [t]);
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
      <ScreenHeader title={t('suppliers.title')} subtitle={t('suppliers.subtitleCount', { count: suppliers.length })} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>{t('suppliers.newContactTitle')}</Text>
            <TextField label={t('suppliers.nameLabel')} value={name} onChangeText={setName} placeholder={t('suppliers.namePlaceholder')} />
            <ChipSelect label={t('suppliers.categoryLabel')} options={categoryOpts} value={category} onChange={setCategory} />
            <TextField
              label={t('suppliers.phoneLabel')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('suppliers.phonePlaceholder')}
              keyboardType="phone-pad"
            />
            <TextField label={t('suppliers.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('suppliers.notesPlaceholder')} />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <Button label={isSaving ? t('suppliers.saving') : t('suppliers.save')} onPress={handleSave} disabled={isSaving} />
          </Card>

          <Text style={styles.sectionTitle}>{t('suppliers.contactsTitle')}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : suppliers.length === 0 ? (
            <EmptyState text={t('suppliers.empty')} />
          ) : (
            suppliers.map((supplier) => (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                colors={colors}
                styles={styles}
                categoryOpts={categoryOpts}
                deleteLabel={t('suppliers.delete')}
                onDelete={() => deleteSupplier(supplier.id)}
              />
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
  categoryOpts,
  deleteLabel,
  onDelete,
}: {
  supplier: Supplier;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
  categoryOpts: { value: Supplier['category']; label: string }[];
  deleteLabel: string;
  onDelete: () => void;
}) {
  const categoryLabel = categoryOpts.find((o) => o.value === supplier.category)?.label ?? supplier.category;

  return (
    <Card style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.supplierName}>{supplier.name}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteLink}>{deleteLabel}</Text>
        </Pressable>
      </View>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
      </View>
      {supplier.phone ? (
        <Pressable onPress={() => Linking.openURL(`tel:${supplier.phone}`)} hitSlop={4}>
          <Text style={[styles.phoneText, { color: colors.primary }]}>{supplier.phone}</Text>
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
