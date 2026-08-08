import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleLotCost, CattleLotCostCategory } from '../types/database';

export const CATTLE_LOT_COST_CATEGORY_LABELS: Record<CattleLotCostCategory, string> = {
  racao: 'Ração',
  sanidade: 'Sanidade',
  frete: 'Frete',
  mao_de_obra: 'Mão de obra',
  outro: 'Outro',
};

/** Custos lançados num lote de corte — ração, sanidade, frete, mão de obra.
 * Base do resumo financeiro (custo x receita projetada x margem) que não
 * existia pra pecuária, só pra lavoura. */
export function useCattleLotCosts(lotId: string | undefined) {
  const [costs, setCosts] = useState<CattleLotCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_lot_costs')
        .select('*')
        .eq('lot_id', lotId)
        .order('applied_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCosts(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os custos.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCost = useCallback(
    async (input: { category: CattleLotCostCategory; description: string; amount: number; applied_at?: string }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_lot_costs').insert({
        lot_id: lotId,
        category: input.category,
        description: input.description,
        amount: input.amount,
        applied_at: input.applied_at || new Date().toISOString().slice(0, 10),
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [lotId, reload]
  );

  const totalCost = costs.reduce((sum, c) => sum + Number(c.amount), 0);

  return { costs, totalCost, isLoading, error, reload, createCost };
}
