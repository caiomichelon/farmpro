import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleMortalityEvent } from '../types/database';

/** Eventos de mortalidade de um lote — base da taxa de mortalidade. */
export function useCattleMortalityEvents(lotId: string | undefined) {
  const [events, setEvents] = useState<CattleMortalityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_mortality_events')
        .select('*')
        .eq('lot_id', lotId)
        .order('event_date', { ascending: false });

      if (fetchError) throw fetchError;
      setEvents(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a mortalidade.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEvent = useCallback(
    async (input: { head_count: number; cause?: string; event_date?: string; notes?: string }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_mortality_events').insert({
        lot_id: lotId,
        head_count: input.head_count,
        cause: input.cause || null,
        event_date: input.event_date || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [lotId, reload]
  );

  const totalDeaths = events.reduce((sum, e) => sum + e.head_count, 0);

  return { events, totalDeaths, isLoading, error, reload, createEvent };
}
