import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { PlotSeason, SeasonStatus } from '../types/database';

export interface SeasonSummary extends PlotSeason {
  totalHarvestedSacas: number;
  totalCost: number;
  yieldPerHectare: number | null;
}

async function withSummary(seasons: PlotSeason[]): Promise<SeasonSummary[]> {
  if (seasons.length === 0) return [];

  const seasonIds = seasons.map((s) => s.id);

  const [{ data: harvests, error: harvestsError }, { data: costs, error: costsError }] = await Promise.all([
    supabase.from('harvest_entries').select('plot_season_id, quantity_sacas').in('plot_season_id', seasonIds),
    supabase.from('production_costs').select('plot_season_id, total_cost').in('plot_season_id', seasonIds),
  ]);

  if (harvestsError) throw harvestsError;
  if (costsError) throw costsError;

  return seasons.map((season) => {
    const totalHarvestedSacas = (harvests ?? [])
      .filter((h) => h.plot_season_id === season.id)
      .reduce((sum, h) => sum + Number(h.quantity_sacas), 0);

    const totalCost = (costs ?? [])
      .filter((c) => c.plot_season_id === season.id)
      .reduce((sum, c) => sum + Number(c.total_cost), 0);

    return {
      ...season,
      totalHarvestedSacas,
      totalCost,
      yieldPerHectare: season.planted_area_hectares > 0 ? totalHarvestedSacas / season.planted_area_hectares : null,
    };
  });
}

export interface SeasonSummaryWithPlot extends SeasonSummary {
  plotName: string;
}

/** Todas as safras da fazenda de uma vez (todos os talhões) — planilha
 * consolidada, igual à ideia da planilha de abates da Pecuária. */
export function useSeasonsByFarm(farmId: string | undefined) {
  const [seasons, setSeasons] = useState<SeasonSummaryWithPlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plot_seasons')
        .select('*, plots!inner(farm_id, name)')
        .eq('plots.farm_id', farmId)
        .order('planting_date', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (PlotSeason & { plots: { name: string } | null })[];
      const summarized = await withSummary(rows);
      setSeasons(summarized.map((s, i) => ({ ...s, plotName: rows[i].plots?.name ?? '' })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as safras.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { seasons, isLoading, error, reload };
}

/** Histórico de safras de um talhão — a base da rotação de cultura e da
 * produtividade histórica pedidas no briefing. */
export function usePlotSeasons(plotId: string | undefined) {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!plotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plot_seasons')
        .select('*')
        .eq('plot_id', plotId)
        .order('planting_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSeasons(await withSummary(data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as safras.');
    } finally {
      setIsLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSeason = useCallback(
    async (input: {
      season_label: string;
      crop: string;
      variety?: string;
      planted_area_hectares: number;
      planting_date?: string;
      status?: SeasonStatus;
    }) => {
      if (!plotId) return { error: 'Talhão não encontrado.', id: null };

      const { data, error: insertError } = await supabase
        .from('plot_seasons')
        .insert({
          plot_id: plotId,
          season_label: input.season_label,
          crop: input.crop,
          variety: input.variety || null,
          planted_area_hectares: input.planted_area_hectares,
          planting_date: input.planting_date || null,
          status: input.status ?? 'plantada',
        })
        .select('id')
        .single();

      if (insertError) return { error: insertError.message, id: null };

      await reload();
      return { error: null, id: data.id as string };
    },
    [plotId, reload]
  );

  return { seasons, isLoading, error, reload, createSeason };
}

export function usePlotSeason(seasonId: string | undefined) {
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!seasonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plot_seasons')
        .select('*')
        .eq('id', seasonId)
        .single();

      if (fetchError) throw fetchError;
      const [summary] = await withSummary([data]);
      setSeason(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a safra.');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { season, isLoading, error, reload };
}
