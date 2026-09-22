import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CattleLotCard } from '../../../../../src/components/CattleLotCard';
import { EmptyState } from '../../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useCattleLots } from '../../../../../src/hooks/useCattleLots';
import { useT } from '../../../../../src/i18n';
import { spacing, typography, useColors, type Colors } from '../../../../../src/theme';

/** Área separada dos lotes já abatidos — sai da lista de lotes ativos (Corte
 * → home) assim que o abate é registrado, e fica guardada aqui, agrupada
 * lote por lote, pra não misturar com o que ainda está em confinamento. */
export default function SlaughteredLotsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { lots, isLoading, error, reload } = useCattleLots(farmId);
  const t = useT();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const slaughteredLots = lots
    .filter((l) => l.status === 'abatido')
    .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('slaughteredLots.title')}
        subtitle={t('slaughteredLots.subtitle', { count: slaughteredLots.length })}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.pecuaria} />
      ) : (
        <FlatList
          style={styles.list}
          data={slaughteredLots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text={t('slaughteredLots.empty')} />}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={Math.min(index, 6) * 50}>
              <CattleLotCard lot={item} t={t} onPress={() => router.push(`/farms/${farmId}/pecuaria/corte/lote/${item.id}`)} />
            </FadeSlideIn>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    // Sem isso, o aviso de erro (sibling logo abaixo) pode sumir no iOS com
    // New Architecture — bug conhecido de FlatList/ScrollView sem
    // style={flex:1} escondendo conteúdo irmão renderizado depois dele
    // (facebook/react-native#44683).
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      flexGrow: 1,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xl,
    },
  });
}
