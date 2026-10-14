import { useCallback, useEffect, useState } from 'react';

import { enqueueMutation, isLikelyNetworkError } from '../lib/offlineQueue';
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
    async (input: {
      head_count: number;
      cause?: string;
      animal_id?: string;
      category?: string;
      photo_url?: string;
      photographer?: string;
      latitude?: number;
      longitude?: number;
      event_date?: string;
      notes?: string;
    }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const payload = {
        lot_id: lotId,
        head_count: input.head_count,
        cause: input.cause || null,
        animal_id: input.animal_id ?? null,
        category: input.category || null,
        photo_url: input.photo_url || null,
        photographer: input.photographer || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        event_date: input.event_date || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      };

      try {
        const { error: insertError } = await supabase.from('cattle_mortality_events').insert(payload);
        if (insertError) {
          // Sem sinal no pasto/curral — guarda localmente pra sincronizar
          // depois, em vez de perder o registro.
          if (isLikelyNetworkError(insertError.message)) {
            await enqueueMutation('cattle_mortality_events', payload);
            return { error: null, queued: true };
          }
          return { error: insertError.message };
        }
      } catch {
        await enqueueMutation('cattle_mortality_events', payload);
        return { error: null, queued: true };
      }

      // Animal rastreado individualmente que morreu sai do rebanho ativo —
      // marca o status dele, sem precisar de um segundo passo manual.
      if (input.animal_id) {
        await supabase.from('cattle_animals').update({ status: 'morto' }).eq('id', input.animal_id);
      }

      await reload();
      return { error: null, queued: false };
    },
    [lotId, reload]
  );

  const totalDeaths = events.reduce((sum, e) => sum + e.head_count, 0);

  return { events, totalDeaths, isLoading, error, reload, createEvent };
}
