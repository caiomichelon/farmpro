import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../src/components/TextField';
import { useEquipment, useEquipmentMaintenance } from '../../../../../src/hooks/useEquipment';
import { useT } from '../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../src/theme';

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export default function EquipmentDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId, equipmentId } = useLocalSearchParams<{ farmId: string; equipmentId: string }>();
  const { equipment } = useEquipment(farmId);
  const item = equipment.find((e) => e.id === equipmentId);
  const { maintenances, isLoading, createMaintenance } = useEquipmentMaintenance(equipmentId);

  const [isAdding, setIsAdding] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    const { error: createError } = await createMaintenance({
      maintenance_type: maintenanceType,
      next_due_date: nextDueDate || undefined,
      cost: cost ? Number(cost.replace(',', '.')) : undefined,
    });
    setIsSaving(false);
    if (createError) {
      setError(createError);
      return;
    }
    setMaintenanceType('');
    setNextDueDate('');
    setCost('');
    setIsAdding(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={item?.name ?? t('equipment.fallbackTitle')} subtitle={t('equipment.maintenanceHistorySubtitle')} />
      <ScrollView contentContainerStyle={styles.content}>
        {isAdding ? (
          <Card style={styles.card}>
            <TextField
              label={t('equipment.maintenanceTypeLabel')}
              value={maintenanceType}
              onChangeText={setMaintenanceType}
              placeholder={t('equipment.maintenanceTypePlaceholder')}
            />
            <TextField
              label={t('equipment.nextDueLabel')}
              value={nextDueDate}
              onChangeText={setNextDueDate}
              placeholder={t('equipment.optionalPlaceholder')}
            />
            <TextField
              label={t('equipment.costLabel')}
              value={cost}
              onChangeText={setCost}
              placeholder={t('equipment.optionalPlaceholder')}
              keyboardType="decimal-pad"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.formButtons}>
              <Button label={t('equipment.cancelButton')} variant="ghost" onPress={() => setIsAdding(false)} style={{ flex: 1 }} />
              <Button
                label={t('equipment.saveMaintenanceButton')}
                onPress={handleSave}
                loading={isSaving}
                disabled={!maintenanceType}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : (
          <Button label={t('equipment.addMaintenanceButton')} onPress={() => setIsAdding(true)} />
        )}

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : maintenances.length === 0 ? (
          <EmptyState text={t('equipment.noMaintenance')} />
        ) : (
          maintenances.map((m) => (
            <Card key={m.id} style={styles.rowCard}>
              <View style={styles.rowTopRow}>
                <Text style={styles.rowTitle}>{m.maintenance_type}</Text>
                <Text style={styles.rowDate}>{formatDateBR(m.performed_at)}</Text>
              </View>
              {m.next_due_date ? (
                <Text style={styles.rowSubtitle}>{t('equipment.nextDuePrefix', { date: formatDateBR(m.next_due_date) })}</Text>
              ) : null}
              {m.cost != null ? (
                <Text style={styles.rowSubtitle}>
                  {t('equipment.costPrefix', { value: Number(m.cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) })}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
    card: {
      gap: spacing.md,
      borderRadius: radius.md,
    },
    formButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    loading: {
      marginTop: spacing.xl,
    },
    rowCard: {
      gap: 2,
      borderRadius: radius.md,
    },
    rowTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rowTitle: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    rowDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
    rowSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
