import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { PesticideApplication } from '../types/database';

/** Aplicações de defensivo (receituário) de uma safra — registro
 * agronômico/legal, com carência calculada até quando fica liberado
 * colher com segurança. */
export function usePesticideApplications(plotSeasonId: string | undefined) {
  const [applications, setApplications] = useState<PesticideApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!plotSeasonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('pesticide_applications')
        .select('*')
        .eq('plot_season_id', plotSeasonId)
        .order('applied_at', { ascending: false });

      if (fetchError) throw fetchError;
      setApplications(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as aplicações.');
    } finally {
      setIsLoading(false);
    }
  }, [plotSeasonId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createApplication = useCallback(
    async (input: {
      product_name: string;
      target_pest?: string;
      dose_per_hectare: number;
      dose_unit?: string;
      area_hectares: number;
      applied_at?: string;
      pre_harvest_interval_days?: number;
      applicator_name?: string;
      notes?: string;
    }) => {
      if (!plotSeasonId) return { error: 'Safra não encontrada.' };
      if (!input.product_name.trim()) return { error: 'Informe o nome do produto.' };
      if (!input.dose_per_hectare || input.dose_per_hectare <= 0) return { error: 'Informe a dose por hectare.' };
      if (!input.area_hectares || input.area_hectares <= 0) return { error: 'Informe a área aplicada.' };

      const { error: insertError } = await supabase.from('pesticide_applications').insert({
        plot_season_id: plotSeasonId,
        product_name: input.product_name.trim(),
        target_pest: input.target_pest?.trim() || null,
        dose_per_hectare: input.dose_per_hectare,
        dose_unit: input.dose_unit || 'L/ha',
        area_hectares: input.area_hectares,
        applied_at: input.applied_at || new Date().toISOString().slice(0, 10),
        pre_harvest_interval_days: input.pre_harvest_interval_days ?? null,
        applicator_name: input.applicator_name?.trim() || null,
        notes: input.notes?.trim() || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [plotSeasonId, reload]
  );

  return { applications, isLoading, error, reload, createApplication };
}

/** Data a partir da qual fica seguro colher, considerando a carência —
 * null se não tiver carência informada. */
export function releaseDateForHarvest(appliedAt: string, preHarvestIntervalDays: number | null): string | null {
  if (preHarvestIntervalDays == null) return null;
  const date = new Date(`${appliedAt}T00:00:00`);
  date.setDate(date.getDate() + preHarvestIntervalDays);
  return date.toISOString().slice(0, 10);
}
