import { useEffect } from 'react';
import { Platform } from 'react-native';

import { requestNotificationPermission, scheduleLocalNotification } from '../lib/localNotifications';
import { supabase } from '../lib/supabase';
import { useProfile } from './useProfile';

function formatDateBR(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Agenda notificações locais no aparelho pra vacinas/tratamentos pendentes
 * e partos previstos nos próximos 30 dias — assim o aviso chega mesmo com o
 * app fechado, sem depender de abrir e olhar a central de alertas. Não faz
 * nada na web nem se o usuário desligou a categoria em Ajustes →
 * Notificações. */
export function useSyncCattleNotifications(farmId: string | undefined) {
  const { isAlertEnabled } = useProfile();

  useEffect(() => {
    if (!farmId || Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;

      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      const in30DaysStr = in30Days.toISOString().slice(0, 10);

      if (isAlertEnabled('vacina_pendente')) {
        const { data } = await supabase
          .from('cattle_animal_health_events')
          .select('id, next_due_date, description, cattle_animals!inner(farm_id, tag_number)')
          .eq('cattle_animals.farm_id', farmId)
          .not('next_due_date', 'is', null)
          .lte('next_due_date', in30DaysStr);

        const rows = (data ?? []) as unknown as {
          id: string;
          next_due_date: string;
          description: string;
          cattle_animals: { tag_number: string } | null;
        }[];

        for (const row of rows) {
          if (cancelled) return;
          const due = new Date(`${row.next_due_date}T08:00:00`);
          await scheduleLocalNotification(
            `vacina-${row.id}`,
            'Vacina/tratamento pendente',
            `Brinco ${row.cattle_animals?.tag_number ?? '—'}: ${row.description}`,
            due
          );
        }
      }

      if (isAlertEnabled('parto_previsto')) {
        const { data } = await supabase
          .from('inseminations')
          .select('id, expected_calving_date, breeding_cows!inner(farm_id, identification)')
          .eq('breeding_cows.farm_id', farmId)
          .not('expected_calving_date', 'is', null)
          .lte('expected_calving_date', in30DaysStr);

        const rows = (data ?? []) as unknown as {
          id: string;
          expected_calving_date: string;
          breeding_cows: { identification: string } | null;
        }[];

        if (rows.length > 0) {
          const { data: calvings } = await supabase
            .from('calvings')
            .select('insemination_id')
            .in(
              'insemination_id',
              rows.map((r) => r.id)
            );
          const calvedIds = new Set((calvings ?? []).map((c) => c.insemination_id));

          for (const row of rows) {
            if (cancelled || calvedIds.has(row.id)) continue;
            // Avisa 3 dias antes da data prevista, às 8h.
            const reminder = new Date(`${row.expected_calving_date}T08:00:00`);
            reminder.setDate(reminder.getDate() - 3);
            await scheduleLocalNotification(
              `parto-${row.id}`,
              'Parto previsto se aproximando',
              `Matriz ${row.breeding_cows?.identification ?? '—'}: previsão pra ${formatDateBR(row.expected_calving_date)}`,
              reminder
            );
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [farmId, isAlertEnabled]);
}
