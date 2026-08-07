import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

export interface LavouraSummary {
  totalPlots: number;
  totalHectares: number;
  activeSeasons: number;
  avgYieldPerHectare: number | null;
  totalCost: number;
  totalRevenue: number;
  margin: number;
}

const EMPTY: LavouraSummary = {
  totalPlots: 0,
  totalHectares: 0,
  activeSeasons: 0,
  avgYieldPerHectare: null,
  totalCost: 0,
  totalRevenue: 0,
  margin: 0,
};

/** Números da Lavoura pra fazenda inteira — inclui o resultado financeiro
 * (custo x receita das vendas de grão), não só contagens. Usado na tela
 * principal da Lavoura pra mostrar indicadores assim que abre. */
export function useLavouraSummary(farmId: string | undefined) {
  const [summary, setSummary] = useState<LavouraSummary>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: plots, error: plotsError } = await supabase
        .from('plots')
        .select('id, area_hectares')
        .eq('farm_id', farmId)
        .eq('type', 'lavoura');
      if (plotsError) throw plotsError;

      const plotIds = (plots ?? []).map((p) => p.id);
      const totalHectares = (plots ?? []).reduce((sum, p) => sum + Number(p.area_hectares), 0);

      if (plotIds.length === 0) {
        setSummary({ ...EMPTY, totalPlots: 0 });
        return;
      }

      const { data: seasons, error: seasonsError } = await supabase
        .from('plot_seasons')
        .select('id, plot_id, status, planted_area_hectares')
        .in('plot_id', plotIds);
      if (seasonsError) throw seasonsError;

      const seasonIds = (seasons ?? []).map((s) => s.id);
      const activeSeasons = (seasons ?? []).filter((s) => s.status !== 'colhida').length;

      let totalHarvestedSacas = 0;
      let harvestedArea = 0;
      let totalCost = 0;
      let totalRevenue = 0;

      if (seasonIds.length > 0) {
        const [{ data: harvests, error: harvestsError }, { data: costs, error: costsError }, { data: sales, error: salesError }] =
          await Promise.all([
            supabase.from('harvest_entries').select('plot_season_id, quantity_sacas').in('plot_season_id', seasonIds),
            supabase.from('production_costs').select('plot_season_id, total_cost').in('plot_season_id', seasonIds),
            supabase.from('grain_sales').select('plot_season_id, quantity_sacas, price_per_saca').in('plot_season_id', seasonIds),
          ]);
        if (harvestsError) throw harvestsError;
        if (costsError) throw costsError;
        if (salesError) throw salesError;

        const harvestedSeasonIds = new Set((harvests ?? []).map((h) => h.plot_season_id));
        totalHarvestedSacas = (harvests ?? []).reduce((sum, h) => sum + Number(h.quantity_sacas), 0);
        harvestedArea = (seasons ?? [])
          .filter((s) => harvestedSeasonIds.has(s.id))
          .reduce((sum, s) => sum + Number(s.planted_area_hectares), 0);

        totalCost = (costs ?? []).reduce((sum, c) => sum + Number(c.total_cost), 0);
        totalRevenue = (sales ?? []).reduce((sum, s) => sum + Number(s.quantity_sacas) * Number(s.price_per_saca), 0);
      }

      setSummary({
        totalPlots: plotIds.length,
        totalHectares,
        activeSeasons,
        avgYieldPerHectare: harvestedArea > 0 ? totalHarvestedSacas / harvestedArea : null,
        totalCost,
        totalRevenue,
        margin: totalRevenue - totalCost,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o resumo da lavoura.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { summary, isLoading, error, reload };
}
