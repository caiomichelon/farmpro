import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { computeWeaningRate, type WeaningRateOverall } from '../lib/reproductiveIndicators';

/** Taxa de desmame do rebanho (geral + por ano de parto) — busca todos os
 * partos e desmames da fazenda (via as matrizes dela) pra calcular. */
export function useWeaningRate(farmId: string | undefined) {
  const [data, setData] = useState<WeaningRateOverall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: cows, error: cowsError } = await supabase.from('breeding_cows').select('id').eq('farm_id', farmId);
      if (cowsError) throw cowsError;

      const cowIds = (cows ?? []).map((c) => c.id);
      if (cowIds.length === 0) {
        setData(computeWeaningRate([], []));
        return;
      }

      const { data: calvings, error: calvingsError } = await supabase
        .from('calvings')
        .select('id, calving_date')
        .in('cow_id', cowIds);
      if (calvingsError) throw calvingsError;

      const calvingIds = (calvings ?? []).map((c) => c.id);
      const { data: weanings, error: weaningsError } =
        calvingIds.length > 0
          ? await supabase.from('weanings').select('calving_id').in('calving_id', calvingIds)
          : { data: [], error: null };
      if (weaningsError) throw weaningsError;

      setData(computeWeaningRate(calvings ?? [], weanings ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível calcular a taxa de desmame.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}
