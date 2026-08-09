import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Plot, PlotType, SeasonStatus } from '../types/database';

export interface PlotWithLatestSeason extends Plot {
  latestCrop: string | null;
  latestSeasonLabel: string | null;
  latestSeasonId: string | null;
  latestSeasonStatus: SeasonStatus | null;
}

/** Safra "certa" pra oferecer como atalho de colheita na home da Lavoura —
 * prioriza a que já está com status "colhendo"; sem nenhuma, cai pra safra
 * mais recente cadastrada em qualquer talhão. `null` quando nenhum talhão
 * tem safra nenhuma ainda (precisa cadastrar uma primeiro). */
export interface ActiveHarvestSeason {
  seasonId: string;
  plotId: string;
  plotName: string;
  crop: string;
  seasonLabel: string;
  status: SeasonStatus;
}

/** Talhões de uma fazenda, com a cultura da safra mais recente de cada um
 * (usado na lista da tela inicial da Lavoura), além da safra mais indicada
 * pra oferecer como atalho de "lançar colheita" na mesma tela. */
export function usePlotsWithLatestSeason(farmId: string | undefined) {
  const [plots, setPlots] = useState<PlotWithLatestSeason[]>([]);
  const [activeSeason, setActiveSeason] = useState<ActiveHarvestSeason | null>(null);
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
              .select('id, plot_id, crop, season_label, status, created_at')
              .in('plot_id', plotIds)
              .order('created_at', { ascending: false })
          : { data: [], error: null };

      if (seasonsError) throw seasonsError;

      const seasons = seasonRows ?? [];

      setPlots(
        (plotRows ?? []).map((plot) => {
          const latest = seasons.find((s) => s.plot_id === plot.id);
          return {
            ...plot,
            latestCrop: latest?.crop ?? null,
            latestSeasonLabel: latest?.season_label ?? null,
            latestSeasonId: latest?.id ?? null,
            latestSeasonStatus: latest?.status ?? null,
          };
        })
      );

      // `seasons` já vem ordenado por created_at desc — a primeira com
      // status "colhendo" é a escolha óbvia; sem nenhuma, usa a mais
      // recente de todas (provavelmente a que a pessoa quer lançar agora).
      const best = seasons.find((s) => s.status === 'colhendo') ?? seasons[0] ?? null;
      if (best) {
        const plot = (plotRows ?? []).find((p) => p.id === best.plot_id);
        setActiveSeason({
          seasonId: best.id,
          plotId: best.plot_id,
          plotName: plot?.name ?? '',
          crop: best.crop,
          seasonLabel: best.season_label,
          status: best.status,
        });
      } else {
        setActiveSeason(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os talhões.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { plots, activeSeason, isLoading, error, reload };
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
    async (input: { name: string; area_hectares: number; max_stocking_rate_ua_ha?: number }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.', id: null };

      const { data, error: insertError } = await supabase
        .from('plots')
        .insert({
          farm_id: farmId,
          name: input.name,
          area_hectares: input.area_hectares,
          type,
          max_stocking_rate_ua_ha: input.max_stocking_rate_ua_ha ?? null,
        })
        .select('id')
        .single();

      if (insertError) return { error: insertError.message, id: null };

      await reload();
      return { error: null, id: data.id as string };
    },
    [farmId, type, reload]
  );

  const updateMaxStockingRate = useCallback(
    async (plotId: string, maxStockingRateUaHa: number | null) => {
      const { error: updateError } = await supabase
        .from('plots')
        .update({ max_stocking_rate_ua_ha: maxStockingRateUaHa })
        .eq('id', plotId);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  return { plots, isLoading, error, reload, createPlot, updateMaxStockingRate };
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
