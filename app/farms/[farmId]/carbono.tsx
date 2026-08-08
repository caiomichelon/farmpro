import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useBreedingCows } from '../../../src/hooks/useBreedingCows';
import { useCattleLots } from '../../../src/hooks/useCattleLots';
import { useFarm } from '../../../src/hooks/useFarms';
import { buildCarbonEstimate } from '../../../src/lib/carbonEstimate';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

export default function CarbonEstimateScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading: farmLoading, updateFarmCarbonPractices } = useFarm(farmId);
  const { lots, isLoading: lotsLoading } = useCattleLots(farmId);
  const { cows, isLoading: cowsLoading } = useBreedingCows(farmId);

  const isLoading = farmLoading || lotsLoading || cowsLoading || !farm;

  const pecuariaHeadCount = lots.filter((l) => l.status === 'ativo').reduce((sum, l) => sum + l.currentHeadCount, 0) + cows.length;

  const estimate = farm
    ? buildCarbonEstimate({
        usesNoTill: farm.carbon_uses_no_till,
        usesCoverCrop: farm.carbon_uses_cover_crop,
        usesRotationalGrazing: farm.carbon_uses_rotational_grazing,
        usesManureManagement: farm.carbon_uses_manure_management,
        lavouraHectares: farm.lavouraHectares,
        pecuariaHectares: farm.pecuariaHectares,
        pecuariaHeadCount,
      })
    : null;

  function togglePractice(
    key: 'usesNoTill' | 'usesCoverCrop' | 'usesRotationalGrazing' | 'usesManureManagement',
    value: boolean
  ) {
    if (!farm || !farmId) return;
    updateFarmCarbonPractices(farmId, {
      carbon_uses_no_till: key === 'usesNoTill' ? value : farm.carbon_uses_no_till,
      carbon_uses_cover_crop: key === 'usesCoverCrop' ? value : farm.carbon_uses_cover_crop,
      carbon_uses_rotational_grazing: key === 'usesRotationalGrazing' ? value : farm.carbon_uses_rotational_grazing,
      carbon_uses_manure_management: key === 'usesManureManagement' ? value : farm.carbon_uses_manure_management,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🌱 Estimativa de carbono" subtitle="Potencial de crédito de carbono a partir das práticas da fazenda" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.disclaimer}>
          Isso é uma estimativa educativa pra dar uma ordem de grandeza — não é um número certificado. Crédito de carbono de
          verdade só sai depois de medição e auditoria por uma certificadora (Verra, Gold Standard etc.).
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Práticas da fazenda</Text>
              <PracticeRow
                title="Plantio direto"
                subtitle={`Lavoura — ${farm!.lavouraHectares.toLocaleString('pt-BR')} ha`}
                value={farm!.carbon_uses_no_till}
                onValueChange={(v) => togglePractice('usesNoTill', v)}
                colors={colors}
                styles={styles}
              />
              <PracticeRow
                title="Cultura de cobertura"
                subtitle={`Lavoura — ${farm!.lavouraHectares.toLocaleString('pt-BR')} ha`}
                value={farm!.carbon_uses_cover_crop}
                onValueChange={(v) => togglePractice('usesCoverCrop', v)}
                colors={colors}
                styles={styles}
              />
              <PracticeRow
                title="Pastejo rotacionado"
                subtitle={`Pecuária — ${farm!.pecuariaHectares.toLocaleString('pt-BR')} ha`}
                value={farm!.carbon_uses_rotational_grazing}
                onValueChange={(v) => togglePractice('usesRotationalGrazing', v)}
                colors={colors}
                styles={styles}
              />
              <PracticeRow
                title="Manejo de dejetos"
                subtitle={`Pecuária — ${pecuariaHeadCount} ${pecuariaHeadCount === 1 ? 'cabeça' : 'cabeças'}`}
                value={farm!.carbon_uses_manure_management}
                onValueChange={(v) => togglePractice('usesManureManagement', v)}
                colors={colors}
                styles={styles}
              />
            </Card>

            {estimate && estimate.lines.length > 0 ? (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Estimativa</Text>
                {estimate.lines.map((line) => (
                  <View key={line.id} style={styles.lineRow}>
                    <Text style={styles.lineLabel}>{line.label}</Text>
                    <Text style={styles.lineValue}>{line.tCO2ePerYear.toFixed(1)} tCO₂e/ano</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total estimado</Text>
                  <Text style={styles.totalValue}>{estimate.totalTCO2ePerYear.toFixed(1)} tCO₂e/ano</Text>
                </View>
              </Card>
            ) : (
              <Text style={styles.hint}>Marque as práticas que sua fazenda já usa acima pra ver a estimativa.</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PracticeRow({
  title,
  subtitle,
  value,
  onValueChange,
  colors,
  styles,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={styles.practiceRow} onPress={() => onValueChange(!value)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.practiceTitle}>{title}</Text>
        <Text style={styles.practiceSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.successLight }}
        thumbColor={colors.surface}
      />
    </Pressable>
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
    disclaimer: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    loading: {
      marginTop: spacing.xl,
    },
    card: {
      gap: spacing.sm,
      borderRadius: radius.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    practiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    practiceTitle: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    practiceSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    lineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    lineLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    lineValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      marginTop: spacing.xs,
    },
    totalLabel: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    totalValue: {
      ...typography.heading,
      color: colors.success,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
