import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { PlotCochoEvent } from '../types/database';

/** Abastecimentos de cocho de um piquete — mais recente primeiro. Base do
 * farol de cor no mapa de piquetes (ver src/lib/cochoFarol.ts). */
export function usePlotCochoEvents(plotId: string | undefined) {
  const [events, setEvents] = useState<PlotCochoEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!plotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plot_cocho_events')
        .select('*')
        .eq('plot_id', plotId)
        .order('refilled_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEvents(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os abastecimentos.');
    } finally {
      setIsLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEvent = useCallback(
    async (input: {
      refilled_at?: string;
      product?: string;
      sacos?: number;
      stock_item_id?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
    }) => {
      if (!plotId) return { error: 'Piquete não encontrado.' };

      const { error: insertError } = await supabase.from('plot_cocho_events').insert({
        plot_id: plotId,
        refilled_at: input.refilled_at || new Date().toISOString().slice(0, 10),
        product: input.product?.trim() || null,
        sacos: input.sacos ?? null,
        stock_item_id: input.stock_item_id ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
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

/** Último abastecimento de cada piquete de uma fazenda, numa única consulta
 * — usado no mapa pra calcular o farol de todos os piquetes de uma vez, sem
 * precisar de uma consulta por piquete. */
export function useLatestCochoEventsByPlot(plotIds: string[]) {
  const [latestByPlotId, setLatestByPlotId] = useState<Record<string, PlotCochoEvent>>({});
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
        .from('plot_cocho_events')
        .select('*')
        .in('plot_id', plotIds)
        .order('refilled_at', { ascending: false });

      if (fetchError) throw fetchError;

      const latest: Record<string, PlotCochoEvent> = {};
      for (const event of data ?? []) {
        if (!latest[event.plot_id]) latest[event.plot_id] = event;
      }
      setLatestByPlotId(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os abastecimentos.');
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
