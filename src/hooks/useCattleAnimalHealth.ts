import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleAnimalHealthEvent, CattleHealthEventType } from '../types/database';

export const HEALTH_EVENT_TYPE_LABELS: Record<CattleHealthEventType, string> = {
  vacina: 'Vacina',
  tratamento: 'Tratamento',
  doenca: 'Doença',
  outro: 'Outro',
};

/** Histórico de saúde de um animal individual. */
export function useCattleAnimalHealthEvents(animalId: string | undefined) {
  const [events, setEvents] = useState<CattleAnimalHealthEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!animalId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_animal_health_events')
        .select('*')
        .eq('animal_id', animalId)
        .order('event_date', { ascending: false });

      if (fetchError) throw fetchError;
      setEvents(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico de saúde.');
    } finally {
      setIsLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEvent = useCallback(
    async (input: { event_type: CattleHealthEventType; description: string; event_date?: string; notes?: string }) => {
      if (!animalId) return { error: 'Animal não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_animal_health_events').insert({
        animal_id: animalId,
        event_type: input.event_type,
        description: input.description,
        event_date: input.event_date || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [animalId, reload]
  );

  return { events, isLoading, error, reload, createEvent };
}
