import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useUniversalSearch, type UniversalSearchResult } from '../../../src/hooks/useUniversalSearch';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

export default function UniversalSearchScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const [query, setQuery] = useState('');
  const { results, isLoading } = useUniversalSearch(farmId, query);

  function handleSelect(result: UniversalSearchResult) {
    router.push(result.href as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🔎 Buscar" subtitle="Animal, lote, matriz, talhão ou funcionário — tudo junto" />
      <View style={styles.searchBar}>
        <TextField label="" value={query} onChangeText={setQuery} placeholder="Digite pelo menos 2 letras..." autoFocus />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : query.trim().length < 2 ? (
          <Text style={styles.hint}>Digite pra buscar em animais, lotes, matrizes, talhões e funcionários da fazenda.</Text>
        ) : results.length === 0 ? (
          <EmptyState text="Nada encontrado com esse termo." />
        ) : (
          results.map((result) => (
            <Pressable key={`${result.type}-${result.id}`} onPress={() => handleSelect(result)}>
              <Card style={styles.resultCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultLabel}>{result.label}</Text>
                  <Text style={styles.resultSublabel}>{result.sublabel}</Text>
                </View>
                <Text style={styles.chevron}>→</Text>
              </Card>
            </Pressable>
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
    searchBar: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.sm,
    },
    loading: {
      marginTop: spacing.xl,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
    },
    resultLabel: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    resultSublabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    chevron: {
      ...typography.heading,
      color: colors.primary,
    },
  });
}
