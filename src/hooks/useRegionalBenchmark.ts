import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

interface RegionalCorteResult {
  regional_avg_gmd_kg_day: number | null;
  regional_avg_cost_per_arroba: number | null;
  participant_farm_count: number;
}

interface RegionalLavouraResult {
  regional_avg_yield_sacas_ha: number | null;
  participant_farm_count: number;
}

/** Mínimo de fazendas participantes (além da sua) pra mostrar a média
 * regional — abaixo disso a própria função no banco já devolve null, mas o
 * front confere de novo pra deixar a regra explícita na UI. */
export const MIN_BENCHMARK_PARTICIPANTS = 3;

type RegionalRpcName = 'regional_benchmark_corte' | 'regional_benchmark_lavoura';

function useRegionalRpc<T>(rpcName: RegionalRpcName, farmId: string | undefined) {
  const [result, setResult] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(rpcName, { p_farm_id: farmId });
      if (rpcError) throw rpcError;
      // Funções de agregação no banco devolvem uma tabela de 1 linha só.
      setResult(((Array.isArray(data) ? data[0] : data) ?? null) as T | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o comparativo regional.');
    } finally {
      setIsLoading(false);
    }
  }, [rpcName, farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { result, isLoading, error, reload };
}

export function useRegionalBenchmarkCorte(farmId: string | undefined) {
  return useRegionalRpc<RegionalCorteResult>('regional_benchmark_corte', farmId);
}

export function useRegionalBenchmarkLavoura(farmId: string | undefined) {
  return useRegionalRpc<RegionalLavouraResult>('regional_benchmark_lavoura', farmId);
}
