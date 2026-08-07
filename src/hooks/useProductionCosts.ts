import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { ProductionCost, ProductionCostCategory } from '../types/database';

export const PRODUCTION_COST_CATEGORY_LABELS: Record<ProductionCostCategory, string> = {
  semente: 'Semente',
  adubo: 'Adubo',
  defensivo: 'Defensivo',
  combustivel: 'Combustível',
  mao_de_obra: 'Mão de obra',
  outro: 'Outro',
};

/** Custo de produção (insumos) de uma safra — inclui o histórico de
 * aplicação de defensivo/adubo (mesma tabela, filtrando por categoria). */
export function useProductionCosts(seasonId: string | undefined) {
  const [costs, setCosts] = useState<ProductionCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!seasonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('production_costs')
        .select('*')
        .eq('plot_season_id', seasonId)
        .order('applied_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCosts(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os custos.');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCost = useCallback(
    async (input: {
      category: ProductionCostCategory;
      description: string;
      quantity?: number;
      unit?: string;
      unit_cost?: number;
      total_cost: number;
      applied_at?: string;
    }) => {
      if (!seasonId) return { error: 'Safra não encontrada.' };

      const { error: insertError } = await supabase.from('production_costs').insert({
        plot_season_id: seasonId,
        category: input.category,
        description: input.description,
        quantity: input.quantity ?? null,
        unit: input.unit || null,
        unit_cost: input.unit_cost ?? null,
        total_cost: input.total_cost,
        applied_at: input.applied_at || new Date().toISOString().slice(0, 10),
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [seasonId, reload]
  );

  const totalCost = costs.reduce((sum, c) => sum + Number(c.total_cost), 0);

  return { costs, totalCost, isLoading, error, reload, createCost };
}
