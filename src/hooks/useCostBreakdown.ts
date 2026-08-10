import { useCallback, useEffect, useState } from 'react';

import { BREEDING_COW_COST_CATEGORY_LABELS } from './useBreedingCowCosts';
import { CATTLE_LOT_COST_CATEGORY_LABELS } from './useCattleLotCosts';
import { PRODUCTION_COST_CATEGORY_LABELS } from './useProductionCosts';
import { supabase } from '../lib/supabase';

export interface CostBreakdownItem {
  sector: 'lavoura' | 'corte' | 'cria' | 'funcionarios';
  sectorLabel: string;
  category: string;
  value: number;
}

const SECTOR_LABELS: Record<CostBreakdownItem['sector'], string> = {
  lavoura: 'Lavoura',
  corte: 'Corte',
  cria: 'Cria',
  funcionarios: 'Funcionários',
};

function sumByCategory<T extends { category: string }>(
  rows: T[],
  amountOf: (row: T) => number,
  labels: Record<string, string>,
  sector: CostBreakdownItem['sector']
): CostBreakdownItem[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + amountOf(row));
  }
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .map(([category, value]) => ({
      sector,
      sectorLabel: SECTOR_LABELS[sector],
      category: labels[category] ?? category,
      value,
    }));
}

/** Pra onde vai o dinheiro da fazenda — junta os custos já lançados nos
 * três setores (Lavoura, Corte, Cria) mais a folha de funcionários, tudo
 * agrupado por categoria, num só lugar. Cada tela de custo (produção,
 * lote, matriz) já existe separada; isso aqui só soma o que já foi
 * lançado, sem inventar nenhum valor novo. */
export function useCostBreakdown(farmId: string | undefined) {
  const [items, setItems] = useState<CostBreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [
        { data: productionCosts, error: productionError },
        { data: lotCosts, error: lotError },
        { data: cowCosts, error: cowError },
        { data: employees, error: employeesError },
      ] = await Promise.all([
        supabase
          .from('production_costs')
          .select('category, total_cost, plot_seasons!inner(plots!inner(farm_id))')
          .eq('plot_seasons.plots.farm_id', farmId),
        supabase
          .from('cattle_lot_costs')
          .select('category, amount, cattle_lots!inner(farm_id)')
          .eq('cattle_lots.farm_id', farmId),
        supabase
          .from('breeding_cow_costs')
          .select('category, amount, breeding_cows!inner(farm_id)')
          .eq('breeding_cows.farm_id', farmId),
        supabase.from('employees').select('cost_value').eq('farm_id', farmId).eq('status', 'ativo'),
      ]);
      if (productionError) throw productionError;
      if (lotError) throw lotError;
      if (cowError) throw cowError;
      if (employeesError) throw employeesError;

      const result: CostBreakdownItem[] = [
        ...sumByCategory(
          (productionCosts ?? []) as { category: string; total_cost: number }[],
          (r) => Number(r.total_cost),
          PRODUCTION_COST_CATEGORY_LABELS,
          'lavoura'
        ),
        ...sumByCategory(
          (lotCosts ?? []) as { category: string; amount: number }[],
          (r) => Number(r.amount),
          CATTLE_LOT_COST_CATEGORY_LABELS,
          'corte'
        ),
        ...sumByCategory(
          (cowCosts ?? []) as { category: string; amount: number }[],
          (r) => Number(r.amount),
          BREEDING_COW_COST_CATEGORY_LABELS,
          'cria'
        ),
      ];

      const payrollTotal = (employees ?? []).reduce((sum, e) => sum + Number(e.cost_value), 0);
      if (payrollTotal > 0) {
        result.push({ sector: 'funcionarios', sectorLabel: SECTOR_LABELS.funcionarios, category: 'Folha (valor cadastrado)', value: payrollTotal });
      }

      result.sort((a, b) => b.value - a.value);
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os custos.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const total = items.reduce((sum, i) => sum + i.value, 0);

  return { items, total, isLoading, error, reload };
}
