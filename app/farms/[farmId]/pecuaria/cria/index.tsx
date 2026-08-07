import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../src/components/Button';
import { Card } from '../../../../../src/components/Card';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useBreedingCows, type BreedingCowSummary } from '../../../../../src/hooks/useBreedingCows';
import { colors, spacing, typography } from '../../../../../src/theme';

export default function CriaHomeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { cows, isLoading, error } = useBreedingCows(farmId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Cria / Reprodução" subtitle={`${cows.length} ${cows.length === 1 ? 'matriz' : 'matrizes'}`} />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : (
        <FlatList
          data={cows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="Nenhuma matriz cadastrada ainda. Comece criando a primeira." />}
          renderItem={({ item }) => (
            <CowCard cow={item} onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/matriz/${item.id}`)} />
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button label="+ Nova matriz" onPress={() => router.push(`/farms/${farmId}/pecuaria/cria/nova-matriz`)} />
      </View>
    </SafeAreaView>
  );
}

function CowCard({ cow, onPress }: { cow: BreedingCowSummary; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{cow.identification}</Text>
        <Text style={styles.cardStat}>
          {cow.calfCount} {cow.calfCount === 1 ? 'bezerro' : 'bezerros'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  cardStat: {
    ...typography.captionMedium,
    color: colors.pecuaria,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
