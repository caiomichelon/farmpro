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
    async (input: {
      event_type: CattleHealthEventType;
      description: string;
      event_date?: string;
      next_due_date?: string;
      notes?: string;
      protocol_id?: string;
    }) => {
      if (!animalId) return { error: 'Animal não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_animal_health_events').insert({
        animal_id: animalId,
        event_type: input.event_type,
        description: input.description,
        event_date: input.event_date || new Date().toISOString().slice(0, 10),
        next_due_date: input.next_due_date || null,
        notes: input.notes || null,
        protocol_id: input.protocol_id || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [animalId, reload]
  );

  return { events, isLoading, error, reload, createEvent };
}

export interface CattleHealthEventWithAnimal extends CattleAnimalHealthEvent {
  animalTagNumber: string;
  lotName: string | null;
}

/** Eventos de saúde de todos os animais da fazenda, com pendências
 * (next_due_date vencida ou próxima) em destaque. */
export function useCattleHealthPendingByFarm(farmId: string | undefined) {
  const [events, setEvents] = useState<CattleHealthEventWithAnimal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_animal_health_events')
        .select('*, cattle_animals!inner(farm_id, tag_number, cattle_lots(name))')
        .eq('cattle_animals.farm_id', farmId)
        .not('next_due_date', 'is', null)
        .order('next_due_date', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (CattleAnimalHealthEvent & {
        cattle_animals: { farm_id: string; tag_number: string; cattle_lots: { name: string } | null } | null;
      })[];
      setEvents(
        rows.map((row) => ({
          ...row,
          animalTagNumber: row.cattle_animals?.tag_number ?? '—',
          lotName: row.cattle_animals?.cattle_lots?.name ?? null,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as pendências de saúde.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { events, isLoading, error, reload };
}
