import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { BreedingCowCost, BreedingCowCostCategory } from '../types/database';

export const BREEDING_COW_COST_CATEGORY_LABELS: Record<BreedingCowCostCategory, string> = {
  racao: 'Ração',
  sanidade: 'Sanidade',
  mao_de_obra: 'Mão de obra',
  outro: 'Outro',
};

/** Custos lançados numa matriz — ração, sanidade, mão de obra. Base do
 * "custo por bezerro produzido", que não existia pra cria antes. */
export function useBreedingCowCosts(cowId: string | undefined) {
  const [costs, setCosts] = useState<BreedingCowCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('breeding_cow_costs')
        .select('*')
        .eq('cow_id', cowId)
        .order('applied_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCosts(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os custos.');
    } finally {
      setIsLoading(false);
    }
  }, [cowId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCost = useCallback(
    async (input: { category: BreedingCowCostCategory; description: string; amount: number; applied_at?: string }) => {
      if (!cowId) return { error: 'Matriz não encontrada.' };

      const { error: insertError } = await supabase.from('breeding_cow_costs').insert({
        cow_id: cowId,
        category: input.category,
        description: input.description,
        amount: input.amount,
        applied_at: input.applied_at || new Date().toISOString().slice(0, 10),
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [cowId, reload]
  );

  const totalCost = costs.reduce((sum, c) => sum + Number(c.amount), 0);

  return { costs, totalCost, isLoading, error, reload, createCost };
}
