import { useCallback, useEffect, useState } from 'react';

import { TIME_ENTRY_SEQUENCE } from '../data/employeeOptions';
import { enqueueMutation, isLikelyNetworkError } from '../lib/offlineQueue';
import { supabase } from '../lib/supabase';
import type { TimeEntry, TimeEntryType } from '../types/database';

function todayKey(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10);
}

/** Registros de ponto de um funcionário — histórico completo, mais recentes primeiro. */
export function useTimeEntries(employeeId: string | undefined) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setEntries(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o ponto.');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEntry = useCallback(
    async (input: {
      entry_type: TimeEntryType;
      latitude?: number;
      longitude?: number;
      location_accuracy_m?: number;
      notes?: string;
    }) => {
      if (!employeeId) return { error: 'Funcionário não encontrado.' };

      const payload = {
        employee_id: employeeId,
        entry_type: input.entry_type,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        location_accuracy_m: input.location_accuracy_m ?? null,
        notes: input.notes || null,
      };

      try {
        const { error: insertError } = await supabase.from('time_entries').insert(payload);
        if (insertError) {
          // Sem sinal de internet — guarda localmente pra sincronizar
          // depois, em vez de travar o registro do ponto.
          if (isLikelyNetworkError(insertError.message)) {
            await enqueueMutation('time_entries', payload);
            return { error: null, queued: true };
          }
          return { error: insertError.message };
        }
      } catch {
        await enqueueMutation('time_entries', payload);
        return { error: null, queued: true };
      }

      await reload();
      return { error: null, queued: false };
    },
    [employeeId, reload]
  );

  // Próxima batida esperada hoje, seguindo a sequência entrada -> saída
  // almoço -> volta almoço -> saída.
  const todaysEntries = entries.filter((e) => todayKey(e.recorded_at) === todayKey(new Date().toISOString()));
  const nextEntryType: TimeEntryType | null =
    todaysEntries.length < TIME_ENTRY_SEQUENCE.length ? TIME_ENTRY_SEQUENCE[todaysEntries.length] : null;

  return { entries, todaysEntries, nextEntryType, isLoading, error, reload, createEntry };
}
