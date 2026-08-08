import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { spacing, typography, useColors, type Colors } from '../theme';

/**
 * Fase 1 do modo offline: o app hoje não guarda escrita pra sincronizar
 * depois (isso é um projeto bem maior — mexeria em toda tela que salva
 * dado). O que dá pra garantir agora, honestamente: avisar na hora que a
 * conexão cai, em vez de deixar o toque em "Salvar" falhar silenciosamente
 * sem explicação. O que já foi digitado no formulário não se perde — os
 * campos continuam preenchidos até salvar com sucesso.
 */
export function OfflineBanner() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isConnected = useNetworkStatus();
  if (isConnected) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Text style={styles.text}>Sem conexão — o que você salvar agora só vai pro servidor quando a internet voltar.</Text>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: colors.warning,
    },
    text: {
      ...typography.captionMedium,
      color: colors.textInverse,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
  });
}
