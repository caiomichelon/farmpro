import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { releaseDateForHarvest, usePesticideApplications } from '../../../../../../src/hooks/usePesticideApplications';
import type { PesticideApplication } from '../../../../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PesticideApplicationsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();
  const { applications, isLoading, createApplication } = usePesticideApplications(seasonId);

  const [isAdding, setIsAdding] = useState(false);
  const [productName, setProductName] = useState('');
  const [targetPest, setTargetPest] = useState('');
  const [dose, setDose] = useState('');
  const [area, setArea] = useState('');
  const [preHarvestDays, setPreHarvestDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    const { error: createError } = await createApplication({
      product_name: productName,
      target_pest: targetPest || undefined,
      dose_per_hectare: Number(dose.replace(',', '.')),
      area_hectares: Number(area.replace(',', '.')),
      pre_harvest_interval_days: preHarvestDays ? Number(preHarvestDays) : undefined,
    });
    setIsSaving(false);
    if (createError) {
      setError(createError);
      return;
    }
    setProductName('');
    setTargetPest('');
    setDose('');
    setArea('');
    setPreHarvestDays('');
    setIsAdding(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Aplicação de defensivo" subtitle="Receituário — produto, dose e carência" />
      <ScrollView contentContainerStyle={styles.content}>
        {isAdding ? (
          <Card style={styles.card}>
            <TextField label="Produto" value={productName} onChangeText={setProductName} placeholder="Ex.: Glifosato 480" />
            <TextField label="Praga/doença alvo" value={targetPest} onChangeText={setTargetPest} placeholder="Opcional" />
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <TextField label="Dose (por ha)" value={dose} onChangeText={setDose} placeholder="Ex.: 2" keyboardType="decimal-pad" />
              </View>
              <View style={styles.formCol}>
                <TextField label="Área aplicada (ha)" value={area} onChangeText={setArea} placeholder="Ex.: 50" keyboardType="decimal-pad" />
              </View>
            </View>
            <TextField
              label="Carência (dias até poder colher)"
              value={preHarvestDays}
              onChangeText={setPreHarvestDays}
              placeholder="Opcional"
              keyboardType="numeric"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.formButtons}>
              <Button label="Cancelar" variant="ghost" onPress={() => setIsAdding(false)} style={{ flex: 1 }} />
              <Button label="Salvar" onPress={handleSave} loading={isSaving} disabled={!productName || !dose || !area} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : (
          <Button label="+ Nova aplicação" onPress={() => setIsAdding(true)} />
        )}

        {isLoading ? (
          <ActivityIndicator color={colors.lavoura} style={styles.loading} />
        ) : applications.length === 0 ? (
          <EmptyState text="Nenhuma aplicação registrada ainda." />
        ) : (
          applications.map((app) => <ApplicationRow key={app.id} app={app} colors={colors} styles={styles} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ApplicationRow({ app, colors, styles }: { app: PesticideApplication; colors: Colors; styles: ReturnType<typeof createStyles> }) {
  const releaseDate = releaseDateForHarvest(app.applied_at, app.pre_harvest_interval_days);
  const stillInWindow = releaseDate !== null && releaseDate > todayIso();

  return (
    <Card style={styles.rowCard}>
      <View style={styles.rowTopRow}>
        <Text style={styles.rowTitle}>{app.product_name}</Text>
        <Text style={styles.rowDate}>{formatDateBR(app.applied_at)}</Text>
      </View>
      <Text style={styles.rowSubtitle}>
        {Number(app.dose_per_hectare).toLocaleString('pt-BR')} {app.dose_unit} · {Number(app.area_hectares).toLocaleString('pt-BR')} ha
      </Text>
      {app.target_pest ? <Text style={styles.rowSubtitle}>Alvo: {app.target_pest}</Text> : null}
      {releaseDate ? (
        <Text style={[styles.rowSubtitle, { color: stillInWindow ? colors.warning : colors.success }]}>
          {stillInWindow ? `Em carência — libera colheita em ${formatDateBR(releaseDate)}` : `Carência cumprida em ${formatDateBR(releaseDate)}`}
        </Text>
      ) : null}
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
    card: {
      gap: spacing.md,
      borderRadius: radius.md,
    },
    formRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    formCol: {
      flex: 1,
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
