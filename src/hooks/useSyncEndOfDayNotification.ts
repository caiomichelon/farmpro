import { useEffect } from 'react';
import { Platform } from 'react-native';

import { requestNotificationPermission, scheduleDailyNotification } from '../lib/localNotifications';
import { useProfile } from './useProfile';

/** Agenda o lembrete de fechamento do dia (todo dia às 18h) — junta ponto
 * pendente, coletas e alertas em aberto num check antes de encerrar o
 * expediente. Não faz nada na web ou se "Fechamento do dia" estiver
 * desligado em Ajustes → Notificações. */
export function useSyncEndOfDayNotification(farmId: string | undefined) {
  const { isAlertEnabled } = useProfile();

  useEffect(() => {
    if (!farmId || Platform.OS === 'web' || !isAlertEnabled('fechamento_diario')) return;

    let cancelled = false;
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;
      await scheduleDailyNotification(
        `fechamento-${farmId}`,
        'Fechamento do dia',
        'Confira o que ficou pra trás antes de encerrar o expediente.',
        18,
        0
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [farmId, isAlertEnabled]);
}
