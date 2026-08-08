import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

interface RegionalCorteResult {
  regional_avg_gmd_kg_day: number | null;
  regional_avg_cost_per_arroba: number | null;
  participant_farm_count: number;
}

interface RegionalCriaResult {
  regional_avg_pregnancy_rate_pct: number | null;
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

type RegionalRpcName = 'regional_benchmark_corte' | 'regional_benchmark_cria' | 'regional_benchmark_lavoura';

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

export function useRegionalBenchmarkCria(farmId: string | undefined) {
  return useRegionalRpc<RegionalCriaResult>('regional_benchmark_cria', farmId);
}

export function useRegionalBenchmarkLavoura(farmId: string | undefined) {
  return useRegionalRpc<RegionalLavouraResult>('regional_benchmark_lavoura', farmId);
}

/** Taxa de diagnósticos positivos da própria fazenda — mesma definição usada
 * na função regional (% de diagnósticos de gestação com resultado
 * "positivo"), pra comparar maçã com maçã. Diferente da "taxa de prenhez"
 * mostrada na home da Cria (que é % do rebanho atualmente prenha). */
export function useOwnPregnancyDiagnosisRate(farmId: string | undefined) {
  const [ratePct, setRatePct] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('pregnancy_diagnoses')
        .select('result, inseminations!inner(breeding_cows!inner(farm_id))')
        .eq('inseminations.breeding_cows.farm_id', farmId);
      const rows = data ?? [];
      setRatePct(rows.length > 0 ? (rows.filter((r) => r.result === 'positivo').length / rows.length) * 100 : null);
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ratePct, isLoading, reload };
}
