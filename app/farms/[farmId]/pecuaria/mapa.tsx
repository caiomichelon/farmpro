import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../../../../src/components/EmptyState';
import { PlotsMap } from '../../../../src/components/PlotsMap';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { usePlots } from '../../../../src/hooks/usePlots';
import { useT } from '../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

function number(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Mapa com o contorno de cada piquete/talhão da pecuária, desenhado por
 * cima do mapa de satélite — primeira peça do "farol" (os próximos passos
 * pintam cada piquete por status de cocho/aguada/etc.; por enquanto é só a
 * base georreferenciada, uma cor só). */
export default function PecuariaMapScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { plots, isLoading, reload } = usePlots(farmId, 'pecuaria');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const mapped = plots.filter((p) => p.boundary && p.boundary.length > 0);
  const totalArea = mapped.reduce((sum, p) => sum + Number(p.area_hectares), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('plotsMap.title')}
        subtitle={t('plotsMap.subtitle', { count: mapped.length, area: number(totalArea, 1) })}
      />
      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : mapped.length === 0 ? (
        <EmptyState text={t('plotsMap.empty')} />
      ) : (
        <>
          <View style={styles.mapWrap}>
            <PlotsMap
              plots={mapped.map((p) => ({
                id: p.id,
                name: p.name,
                areaHectares: Number(p.area_hectares),
                boundary: p.boundary ?? [],
              }))}
              height={320}
              color={colors.pecuaria}
            />
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {mapped
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))
              .map((p) => (
                <View key={p.id} style={styles.row}>
                  <Text style={styles.rowName}>{p.name}</Text>
                  <Text style={styles.rowArea}>{number(Number(p.area_hectares), 1)} ha</Text>
                </View>
              ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    mapWrap: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    rowName: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    rowArea: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
