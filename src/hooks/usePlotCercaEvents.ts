import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { PlotCercaEvent, PlotCercaStatus } from '../types/database';

/** Checagens de cerca de um piquete — mais recente primeiro. Base do farol
 * de cor no mapa de piquetes (ver src/lib/cercaFarol.ts). */
export function usePlotCercaEvents(plotId: string | undefined) {
  const [events, setEvents] = useState<PlotCercaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!plotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plot_cerca_events')
        .select('*')
        .eq('plot_id', plotId)
        .order('checked_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEvents(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as checagens de cerca.');
    } finally {
      setIsLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEvent = useCallback(
    async (input: { status: PlotCercaStatus; checked_at?: string; notes?: string }) => {
      if (!plotId) return { error: 'Piquete não encontrado.' };

      const { error: insertError } = await supabase.from('plot_cerca_events').insert({
        plot_id: plotId,
        status: input.status,
        checked_at: input.checked_at || new Date().toISOString().slice(0, 10),
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

/** Última checagem de cerca de cada piquete de uma fazenda, numa única
 * consulta — mesmo padrão de useLatestAguadaEventsByPlot. */
export function useLatestCercaEventsByPlot(plotIds: string[]) {
  const [latestByPlotId, setLatestByPlotId] = useState<Record<string, PlotCercaEvent>>({});
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
        .from('plot_cerca_events')
        .select('*')
        .in('plot_id', plotIds)
        .order('checked_at', { ascending: false });

      if (fetchError) throw fetchError;

      const latest: Record<string, PlotCercaEvent> = {};
      for (const event of data ?? []) {
        if (!latest[event.plot_id]) latest[event.plot_id] = event;
      }
      setLatestByPlotId(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as checagens de cerca.');
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
