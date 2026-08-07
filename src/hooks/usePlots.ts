import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Plot, PlotType } from '../types/database';

export interface PlotWithLatestSeason extends Plot {
  latestCrop: string | null;
  latestSeasonLabel: string | null;
}

/** Talhões de uma fazenda, com a cultura da safra mais recente de cada um
 * (usado na lista da tela inicial da Lavoura). */
export function usePlotsWithLatestSeason(farmId: string | undefined) {
  const [plots, setPlots] = useState<PlotWithLatestSeason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: plotRows, error: plotsError } = await supabase
        .from('plots')
        .select('*')
        .eq('farm_id', farmId)
        .eq('type', 'lavoura')
        .order('name', { ascending: true });

      if (plotsError) throw plotsError;

      const plotIds = (plotRows ?? []).map((p) => p.id);
      const { data: seasonRows, error: seasonsError } =
        plotIds.length > 0
          ? await supabase
              .from('plot_seasons')
              .select('plot_id, crop, season_label, created_at')
              .in('plot_id', plotIds)
              .order('created_at', { ascending: false })
          : { data: [], error: null };

      if (seasonsError) throw seasonsError;

      setPlots(
        (plotRows ?? []).map((plot) => {
          const latest = (seasonRows ?? []).find((s) => s.plot_id === plot.id);
          return { ...plot, latestCrop: latest?.crop ?? null, latestSeasonLabel: latest?.season_label ?? null };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os talhões.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { plots, isLoading, error, reload };
}

/** Talhões de uma fazenda, filtrados por tipo (lavoura ou pecuária). */
export function usePlots(farmId: string | undefined, type: PlotType) {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plots')
        .select('*')
        .eq('farm_id', farmId)
        .eq('type', type)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setPlots(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os talhões.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId, type]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createPlot = useCallback(
    async (input: { name: string; area_hectares: number }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('plots').insert({
        farm_id: farmId,
        name: input.name,
        area_hectares: input.area_hectares,
        type,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, type, reload]
  );

  return { plots, isLoading, error, reload, createPlot };
}

export function usePlot(plotId: string | undefined) {
  const [plot, setPlot] = useState<Plot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!plotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('plots').select('*').eq('id', plotId).single();
      if (fetchError) throw fetchError;
      setPlot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o talhão.');
    } finally {
      setIsLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { plot, isLoading, error, reload };
}
