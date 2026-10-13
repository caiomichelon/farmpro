import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { PlotForageEvent } from '../types/database';

/** Medições de altura de forragem de um piquete — mais recente primeiro.
 * Base do farol de cor no mapa de piquetes (ver src/lib/forageFarol.ts). */
export function usePlotForageEvents(plotId: string | undefined) {
  const [events, setEvents] = useState<PlotForageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!plotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plot_forage_events')
        .select('*')
        .eq('plot_id', plotId)
        .order('measured_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEvents(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as medições de forragem.');
    } finally {
      setIsLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEvent = useCallback(
    async (input: { height_cm: number; measured_at?: string; notes?: string }) => {
      if (!plotId) return { error: 'Piquete não encontrado.' };

      const { error: insertError } = await supabase.from('plot_forage_events').insert({
        plot_id: plotId,
        height_cm: input.height_cm,
        measured_at: input.measured_at || new Date().toISOString().slice(0, 10),
        notes: input.notes?.trim() || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [plotId, reload]
  );

  return { events, isLoading, error, reload, createEvent };
}

/** Última medição de altura de forragem de cada piquete de uma fazenda,
 * numa única consulta — usado no mapa pra calcular o farol de todos os
 * piquetes de uma vez, sem precisar de uma consulta por piquete. */
export function useLatestForageEventsByPlot(plotIds: string[]) {
  const [latestByPlotId, setLatestByPlotId] = useState<Record<string, PlotForageEvent>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = plotIds.slice().sort().join(',');

  const reload = useCallback(async () => {
    if (plotIds.length === 0) {
      setLatestByPlotId({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plot_forage_events')
        .select('*')
        .in('plot_id', plotIds)
        .order('measured_at', { ascending: false });

      if (fetchError) throw fetchError;

      const latest: Record<string, PlotForageEvent> = {};
      for (const event of data ?? []) {
        if (!latest[event.plot_id]) latest[event.plot_id] = event;
      }
      setLatestByPlotId(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as medições de forragem.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { latestByPlotId, isLoading, error, reload };
}
