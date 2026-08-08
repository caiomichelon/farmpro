import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** Se o aparelho tem conexão agora. Começa otimista (`true`) pra não piscar
 * um aviso de "sem conexão" no primeiro instante, antes do NetInfo
 * responder. */
export function useNetworkStatus(): boolean {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return isConnected;
}
