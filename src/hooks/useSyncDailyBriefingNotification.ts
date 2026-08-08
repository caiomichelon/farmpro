import { useEffect } from 'react';
import { Platform } from 'react-native';

import { requestNotificationPermission, scheduleDailyNotification } from '../lib/localNotifications';
import { useProfile } from './useProfile';

/** Agenda o lembrete diário do boletim de voz (todo dia às 6h30) — o
 * conteúdo em si é gerado na hora, ao abrir a tela Boletim, então aqui só
 * agenda o "toca a campainha", não o texto. Não faz nada na web ou se
 * "Boletim diário" estiver desligado em Ajustes → Notificações. */
export function useSyncDailyBriefingNotification(farmId: string | undefined) {
  const { isAlertEnabled } = useProfile();

  useEffect(() => {
    if (!farmId || Platform.OS === 'web' || !isAlertEnabled('boletim_diario')) return;

    let cancelled = false;
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;
      await scheduleDailyNotification(
        `boletim-${farmId}`,
        'Boletim da fazenda',
        'Seu resumo de hoje está pronto — toque pra ouvir.',
        6,
        30
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [farmId, isAlertEnabled]);
}
