import { useEffect } from 'react';
import { Platform } from 'react-native';

import { requestNotificationPermission, scheduleDailyNotification } from '../lib/localNotifications';
import { useProfile } from './useProfile';

/** Lembrete diário (8h) pra tirar a foto do dia dos lotes — cada foto
 * empilhada com o tempo vira um timelapse da evolução do gado. Não faz
 * nada na web ou se "Foto diária" estiver desligado em Ajustes →
 * Notificações. */
export function useSyncDailyPhotoReminder(farmId: string | undefined) {
  const { isAlertEnabled } = useProfile();

  useEffect(() => {
    if (!farmId || Platform.OS === 'web' || !isAlertEnabled('foto_diaria')) return;

    let cancelled = false;
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;
      await scheduleDailyNotification(
        `foto-diaria-${farmId}`,
        'Foto do dia',
        'Tire uma foto geral do lote hoje — com o tempo vira um timelapse da evolução do gado.',
        8,
        0
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [farmId, isAlertEnabled]);
}
