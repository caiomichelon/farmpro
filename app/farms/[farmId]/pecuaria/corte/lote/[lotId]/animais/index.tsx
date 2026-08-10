import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../../src/components/Button';
import { Card } from '../../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../../../src/components/ScreenHeader';
import { useCattleAnimals, type CattleAnimalSummary } from '../../../../../../../../src/hooks/useCattleAnimals';
import { spacing, typography, useColors, type Colors } from '../../../../../../../../src/theme';

export default function LotAnimalsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { animals, isLoading, error, reload } = useCattleAnimals(lotId);

  // "Novo animal" é uma rota separada — refaz a busca ao voltar pra cá.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Animais do lote"
        subtitle={`${animals.length} ${animals.length === 1 ? 'animal' : 'animais'}`}
        right={
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/animais/vacinar-lote`)} hitSlop={12}>
              <Text style={styles.headerLink}>Aplicar em lote</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/animais/importar`)} hitSlop={12}>
              <Text style={styles.headerLink}>Importar</Text>
            </Pressable>
          </View>
        }
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : (
        <FlatList
          data={animals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="Nenhum animal individual cadastrado neste lote ainda." />}
          renderItem={({ item }) => (
            <AnimalCard
              animal={item}
              styles={styles}
              onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/animal/${item.id}`)}
            />
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Button
          label="+ Novo animal"
          onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${lotId}/animais/novo-animal`)}
        />
      </View>
    </SafeAreaView>
  );
}

function AnimalCard({
  animal,
  onPress,
  styles,
}: {
  animal: CattleAnimalSummary;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>Brinco {animal.tag_number}</Text>
        {animal.latestWeightKg !== null ? (
          <Text style={styles.cardWeight}>{animal.latestWeightKg.toFixed(0)} kg</Text>
        ) : null}
      </View>
      <Text style={styles.cardMeta}>
        {animal.sex ? (animal.sex === 'macho' ? 'Macho' : 'Fêmea') : 'Sexo não informado'}
        {animal.breed ? ` · ${animal.breed}` : ''}
      </Text>
      {animal.official_id_number ? <Text style={styles.cardOfficialId}>Nº oficial: {animal.official_id_number}</Text> : null}
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerLinks: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    headerLink: {
      ...typography.captionMedium,
      color: colors.pecuaria,
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
    cardWeight: {
      ...typography.captionMedium,
      color: colors.pecuaria,
    },
    cardMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardOfficialId: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
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
}
