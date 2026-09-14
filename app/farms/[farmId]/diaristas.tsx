import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useCasualLaborers } from '../../../src/hooks/useCasualLaborers';
import { useT, type TFunction } from '../../../src/i18n';
import type { CasualLaborer } from '../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function sectorOptions(t: TFunction): { value: CasualLaborer['sector']; label: string }[] {
  return [
    { value: 'geral', label: t('casualLaborers.sectorGeral') },
    { value: 'lavoura', label: t('casualLaborers.sectorLavoura') },
    { value: 'corte', label: t('casualLaborers.sectorCorte') },
    { value: 'cria', label: t('casualLaborers.sectorCria') },
  ];
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CasualLaborersScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const sectorOpts = useMemo(() => sectorOptions(t), [t]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { laborers, isLoading, error, createLaborer, deleteLaborer, totalPaid } = useCasualLaborers(farmId);

  const [workerName, setWorkerName] = useState('');
  const [sector, setSector] = useState<CasualLaborer['sector']>('geral');
  const [taskDescription, setTaskDescription] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    setFormError(null);
    setIsSaving(true);
    const { error: createError } = await createLaborer({
      worker_name: workerName,
      sector,
      task_description: taskDescription,
      amount_paid: Number(amountPaid.replace(',', '.')) || 0,
    });
    setIsSaving(false);
    if (createError) {
      setFormError(createError);
      return;
    }
    setWorkerName('');
    setSector('geral');
    setTaskDescription('');
    setAmountPaid('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('casualLaborers.title')}
        subtitle={t('casualLaborers.subtitle', { count: laborers.length, total: formatCurrency(totalPaid) })}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>{t('casualLaborers.newRecordTitle')}</Text>
            <TextField
              label={t('casualLaborers.workerNameLabel')}
              value={workerName}
              onChangeText={setWorkerName}
              placeholder={t('casualLaborers.workerNamePlaceholder')}
            />
            <ChipSelect label={t('casualLaborers.sectorLabel')} options={sectorOpts} value={sector} onChange={setSector} />
            <TextField
              label={t('casualLaborers.taskLabel')}
              value={taskDescription}
              onChangeText={setTaskDescription}
              placeholder={t('casualLaborers.taskPlaceholder')}
            />
            <TextField
              label={t('casualLaborers.amountLabel')}
              value={amountPaid}
              onChangeText={setAmountPaid}
              placeholder={t('casualLaborers.amountPlaceholder')}
              keyboardType="decimal-pad"
            />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <Button label={isSaving ? t('casualLaborers.saving') : t('casualLaborers.save')} onPress={handleSave} disabled={isSaving} />
          </Card>

          <Text style={styles.sectionTitle}>{t('casualLaborers.historyTitle')}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : laborers.length === 0 ? (
            <EmptyState text={t('casualLaborers.empty')} />
          ) : (
            laborers.map((laborer) => (
              <LaborerRow
                key={laborer.id}
                laborer={laborer}
                colors={colors}
                styles={styles}
                sectorOpts={sectorOpts}
                deleteLabel={t('casualLaborers.delete')}
                onDelete={() => deleteLaborer(laborer.id)}
              />
            ))
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LaborerRow({
  laborer,
  colors,
  styles,
  sectorOpts,
  deleteLabel,
  onDelete,
}: {
  laborer: CasualLaborer;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
  sectorOpts: { value: CasualLaborer['sector']; label: string }[];
  deleteLabel: string;
  onDelete: () => void;
}) {
  const sectorColor =
    laborer.sector === 'lavoura' ? colors.lavoura : laborer.sector === 'corte' || laborer.sector === 'cria' ? colors.pecuaria : colors.textMuted;
  const sectorLabel = sectorOpts.find((o) => o.value === laborer.sector)?.label ?? laborer.sector;

  return (
    <Card style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.workerName}>{laborer.worker_name}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteLink}>{deleteLabel}</Text>
        </Pressable>
      </View>
      <View style={styles.badgeRow}>
        <View style={[styles.sectorBadge, { backgroundColor: `${sectorColor}22` }]}>
          <Text style={[styles.sectorBadgeText, { color: sectorColor }]}>{sectorLabel}</Text>
        </View>
        <Text style={styles.rowDate}>{formatDate(laborer.work_date)}</Text>
      </View>
      {laborer.task_description ? <Text style={styles.taskText}>{laborer.task_description}</Text> : null}
      <Text style={styles.amountText}>{formatCurrency(Number(laborer.amount_paid))}</Text>
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
    workerName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    deleteLink: {
      ...typography.caption,
      color: colors.danger,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectorBadge: {
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    sectorBadgeText: {
      ...typography.captionMedium,
    },
    rowDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
    taskText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    amountText: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
  });
}
