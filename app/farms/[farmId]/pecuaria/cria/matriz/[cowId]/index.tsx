import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { useBreedingCow } from '../../../../../../../src/hooks/useBreedingCows';
import { useCalvings } from '../../../../../../../src/hooks/useCalvings';
import { useInseminations } from '../../../../../../../src/hooks/useInseminations';
import { colors, radius, spacing, typography } from '../../../../../../../src/theme';

export default function CowDetailScreen() {
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

  const lastInsemination = inseminations[0];
  const hasOpenPregnancy =
    lastInsemination && !calvings.some((c) => c.insemination_id === lastInsemination.id);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={cow.identification}
        subtitle={`${cow.calfCount} ${cow.calfCount === 1 ? 'bezerro' : 'bezerros'} até hoje`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {hasOpenPregnancy && lastInsemination.expected_calving_date ? (
          <View style={styles.predictionCard}>
            <Text style={styles.predictionLabel}>Previsão de parto</Text>
            <Text style={styles.predictionValue}>{formatDate(lastInsemination.expected_calving_date)}</Text>
          </View>
        ) : null}

        <Section title="Inseminações">
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

        <Section title="Partos">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

const styles = StyleSheet.create({
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
  predictionCard: {
    backgroundColor: colors.pecuariaLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  predictionLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  predictionValue: {
    ...typography.displayMd,
    color: colors.pecuaria,
    marginTop: 2,
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
