import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import {
  REPRODUCTIVE_STATUS_LABELS,
  useBreedingCow,
  type ReproductiveStatus,
} from '../../../../../../../src/hooks/useBreedingCows';
import { useCalvings } from '../../../../../../../src/hooks/useCalvings';
import { useInseminations } from '../../../../../../../src/hooks/useInseminations';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

const STATUS_COLOR_KEY: Record<ReproductiveStatus, 'pecuaria' | 'textMuted' | 'danger'> = {
  prenha: 'pecuaria',
  vazia: 'textMuted',
  vazia_atencao: 'danger',
  nunca_coberta: 'textMuted',
};

export default function CowDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, cowId } = useLocalSearchParams<{ farmId: string; cowId: string }>();
  const { cow, isLoading, reload: reloadCow } = useBreedingCow(cowId);
  const { inseminations, reload: reloadInseminations } = useInseminations(cowId);
  const { calvings, reload: reloadCalvings } = useCalvings(cowId);

  // Inseminação e parto são cadastrados em rotas separadas.
  useFocusEffect(
    useCallback(() => {
      reloadCow();
      reloadInseminations();
      reloadCalvings();
    }, [reloadCow, reloadInseminations, reloadCalvings])
  );

  if (isLoading || !cow) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      </SafeAreaView>
    );
  }

  const statusColor = colors[STATUS_COLOR_KEY[cow.reproductiveStatus]];
  const costPerCalf = cow.calfCount > 0 ? cow.totalCost / cow.calfCount : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={cow.identification}
        subtitle={`${cow.calfCount} ${cow.calfCount === 1 ? 'bezerro' : 'bezerros'} até hoje`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {REPRODUCTIVE_STATUS_LABELS[cow.reproductiveStatus]}
          </Text>
          {cow.isPregnant && cow.expectedCalvingDate ? (
            <Text style={styles.statusSubtext}>Previsão de parto: {formatDate(cow.expectedCalvingDate)}</Text>
          ) : cow.daysEmpty !== null ? (
            <Text style={styles.statusSubtext}>{cow.daysEmpty} dias sem prenhez nova</Text>
          ) : null}
        </View>

        <Card style={styles.financialCard}>
          <Text style={styles.financialTitle}>Custo</Text>
          <View style={styles.financialRow}>
            <View style={styles.financialCell}>
              <Text style={styles.financialLabel}>Custo total</Text>
              <Text style={[styles.financialValue, { color: colors.danger }]}>
                {cow.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCell}>
              <Text style={styles.financialLabel}>Custo por bezerro</Text>
              <Text style={styles.financialValue}>
                {costPerCalf !== null ? costPerCalf.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
              </Text>
            </View>
          </View>
          <Button
            label="+ Lançar custo"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/custos`)}
          />
        </Card>

        <Section title="Inseminações" styles={styles}>
          {inseminations.length === 0 ? (
            <EmptyState text="Nenhuma inseminação registrada ainda." />
          ) : (
            inseminations.map((i) => (
              <Card key={i.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>{i.method ?? 'Inseminação'}</Text>
                  <Text style={styles.rowDate}>{formatDate(i.insemination_date)}</Text>
                </View>
                {i.veterinarian ? <Text style={styles.rowNotes}>Veterinário: {i.veterinarian}</Text> : null}
                {i.expected_calving_date ? (
                  <Text style={styles.rowNotes}>Previsão de parto: {formatDate(i.expected_calving_date)}</Text>
                ) : null}
              </Card>
            ))
          )}
          <Button
            label="+ Nova inseminação"
            variant="secondary"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/nova-inseminacao`)}
          />
        </Section>

        <Section title="Partos" styles={styles}>
          {calvings.length === 0 ? (
            <EmptyState text="Nenhum parto registrado ainda." />
          ) : (
            calvings.map((c) => (
              <Card key={c.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowValue}>
                    {c.calf_count} {c.calf_count === 1 ? 'bezerro' : 'bezerros'}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(c.calving_date)}</Text>
                </View>
                {c.calf_identification ? <Text style={styles.rowNotes}>{c.calf_identification}</Text> : null}
              </Card>
            ))
          )}
          <Button
            label="+ Registrar parto"
            onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${cowId}/novo-parto`)}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
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
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.xxl,
    },
    statusBadge: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: 2,
    },
    statusText: {
      ...typography.subheading,
    },
    statusSubtext: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    financialCard: {
      gap: spacing.md,
    },
    financialTitle: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
    financialRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    financialCell: {
      flex: 1,
      gap: 2,
    },
    financialLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    financialValue: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    financialDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    sectionBody: {
      gap: spacing.md,
    },
    rowCard: {
      gap: 2,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    rowDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
    rowNotes: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
