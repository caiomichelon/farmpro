import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

import { flushOfflineQueue, getQueueCount } from '../lib/offlineQueue';

/** Sincroniza a fila offline (ponto digital e coletas de campo lançados
 * sem sinal) sempre que a conexão volta, além de tentar uma vez ao abrir
 * o app. Expõe o contador de pendências pra mostrar um aviso discreto na
 * tela, e `syncNow` pro botão manual. */
export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    setPendingCount(await getQueueCount());
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await flushOfflineQueue();
    } finally {
      await refreshCount();
      setIsSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    syncNow();

    let wasConnected: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
      // Só sincroniza na transição de "sem sinal" pra "com sinal" — não em
      // toda notificação de estado (o listener dispara bastante).
      if (isConnected && wasConnected === false) {
        syncNow();
      }
      wasConnected = isConnected;
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pendingCount, isSyncing, syncNow };
}
