import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { useFarmAlerts } from './useFarmAlerts';

export interface EndOfDaySummary {
  activeEmployeeCount: number;
  employeesWithoutPontoToday: string[];
  fieldCollectionsToday: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Resumo pro "fechamento do dia" — o que ficou pra trás antes de encerrar
 * o expediente: quem não bateu ponto hoje, quantas coletas de campo foram
 * feitas, e quantos alertas ainda estão em aberto. Junta tudo num lugar só
 * em vez do produtor descobrir 3 dias depois que ninguém bateu ponto. */
export function useEndOfDaySummary(farmId: string | undefined) {
  const { alerts, isLoading: alertsLoading, reload: reloadAlerts } = useFarmAlerts(farmId);
  const [summary, setSummary] = useState<EndOfDaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const today = todayStr();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('farm_id', farmId)
        .eq('status', 'ativo');
      if (employeesError) throw employeesError;

      const employeeIds = (employees ?? []).map((e) => e.id);
      let employeesWithoutPontoToday: string[] = [];

      if (employeeIds.length > 0) {
        const { data: entriesToday, error: entriesError } = await supabase
          .from('time_entries')
          .select('employee_id')
          .in('employee_id', employeeIds)
          .gte('recorded_at', `${today}T00:00:00`)
          .lt('recorded_at', `${tomorrowStr}T00:00:00`);
        if (entriesError) throw entriesError;

        const idsWithEntry = new Set((entriesToday ?? []).map((e) => e.employee_id));
        employeesWithoutPontoToday = (employees ?? [])
          .filter((e) => !idsWithEntry.has(e.id))
          .map((e) => e.full_name);
      }

      const { data: collectionsToday, error: collectionsError } = await supabase
        .from('cattle_field_collections')
        .select('id, cattle_lots!inner(farm_id)')
        .eq('cattle_lots.farm_id', farmId)
        .gte('collected_at', `${today}T00:00:00`)
        .lt('collected_at', `${tomorrowStr}T00:00:00`);
      if (collectionsError) throw collectionsError;

      await reloadAlerts();

      setSummary({
        activeEmployeeCount: employeeIds.length,
        employeesWithoutPontoToday,
        fieldCollectionsToday: (collectionsToday ?? []).length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o fechamento do dia.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // `openAlertsCount` vem direto do estado (sempre atualizado) do
  // useFarmAlerts em vez de ficar guardado dentro de `summary` — assim não
  // corre o risco de ficar com um valor velho de uma closure antiga.
  return { summary, openAlertsCount: alerts.length, isLoading: isLoading || alertsLoading, error, reload };
}
