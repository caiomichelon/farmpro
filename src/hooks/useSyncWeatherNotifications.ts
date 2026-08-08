import { useEffect } from 'react';
import { Platform } from 'react-native';

import { requestNotificationPermission, scheduleLocalNotification } from '../lib/localNotifications';
import { supabase } from '../lib/supabase';
import { deriveWeatherRisks, fetchWeatherForecast } from '../lib/weather';
import { useProfile } from './useProfile';

/** Agenda notificações locais pros riscos de clima detectados nos próximos
 * dias — avisa na véspera às 18h (dá tempo de agir: recolher o gado, segurar
 * a pulverização) em vez de só mostrar o alerta quando alguém abre o app.
 * Não faz nada na web, sem localização da fazenda definida, ou se "Clima"
 * estiver desligado em Ajustes → Notificações. */
export function useSyncWeatherNotifications(farmId: string | undefined) {
  const { isAlertEnabled } = useProfile();

  useEffect(() => {
    if (!farmId || Platform.OS === 'web' || !isAlertEnabled('clima')) return;

    let cancelled = false;

    (async () => {
      const { data: farm } = await supabase.from('farms').select('latitude, longitude').eq('id', farmId).single();
      if (cancelled || farm?.latitude == null || farm?.longitude == null) return;

      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;

      const forecast = await fetchWeatherForecast(Number(farm.latitude), Number(farm.longitude));
      if (cancelled) return;
      const risks = deriveWeatherRisks(forecast);

      for (const risk of risks) {
        if (cancelled) return;
        // Avisa às 18h da véspera do dia de risco.
        const reminder = new Date(`${risk.date}T18:00:00`);
        reminder.setDate(reminder.getDate() - 1);
        await scheduleLocalNotification(`clima-${farmId}-${risk.type}-${risk.date}`, risk.title, risk.description, reminder);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [farmId, isAlertEnabled]);
}
