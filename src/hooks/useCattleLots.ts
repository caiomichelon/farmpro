import { useCallback, useEffect, useState } from 'react';

import { getCommodityQuotes } from '../data/commodities';
import { supabase } from '../lib/supabase';
import type { CattleLot } from '../types/database';

const KG_PER_ARROBA = 15;

export type CattleLotReadiness = 'recem_chegado' | 'engordando' | 'pronto';

export const CATTLE_LOT_READINESS_LABELS: Record<CattleLotReadiness, string> = {
  recem_chegado: 'Recém-chegado',
  engordando: 'Em engorda',
  pronto: 'Pronto pra abate',
};

export interface CattleLotSummary extends CattleLot {
  currentHeadCount: number;
  latestWeightKg: number;
  latestWeighingDate: string | null;
  gmdKgPerDay: number | null;
  mortalityRatePct: number;
  daysInLot: number;
  readiness: CattleLotReadiness;
  /** kg que faltam pra bater a meta — null se não tem meta definida, 0 ou
   * negativo quando já bateu (ou passou) o peso alvo. */
  kgToTarget: number | null;
  /** Data estimada (peso atual + GMD até bater a meta) — null se já está
   * pronto, sem meta definida, ou sem GMD conhecido ainda pra projetar. */
  estimatedExitDate: string | null;
  totalCost: number;
  costPerHead: number;
  /** Custo lançado dividido pelas @ estimadas no peso atual — quanto mais
   * baixo, mais barato está saindo a arroba produzida deste lote. Null se
   * ainda não há @ estimadas (ex.: peso zerado). */
  costPerArroba: number | null;
  estimatedArrobas: number;
  projectedRevenue: number;
  projectedMargin: number;
}

function daysBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function withSummary(lots: CattleLot[]): Promise<CattleLotSummary[]> {
  if (lots.length === 0) return [];
  const lotIds = lots.map((l) => l.id);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: weighings, error: weighingsError },
    { data: mortality, error: mortalityError },
    { data: costs, error: costsError },
    quotes,
  ] = await Promise.all([
    supabase
      .from('cattle_lot_weighings')
      .select('lot_id, weighed_at, avg_weight_kg')
      .in('lot_id', lotIds)
      .order('weighed_at', { ascending: true }),
    supabase.from('cattle_mortality_events').select('lot_id, head_count').in('lot_id', lotIds),
    supabase.from('cattle_lot_costs').select('lot_id, amount').in('lot_id', lotIds),
    getCommodityQuotes(),
  ]);

  if (weighingsError) throw weighingsError;
  if (mortalityError) throw mortalityError;
  if (costsError) throw costsError;

  const boiGordoPricePerArroba = quotes.find((q) => q.id === 'boi-gordo')?.price ?? 0;

  return lots.map((lot) => {
    const lotWeighings = (weighings ?? []).filter((w) => w.lot_id === lot.id);
    const latest = lotWeighings[lotWeighings.length - 1];
    const totalMortality = (mortality ?? [])
      .filter((m) => m.lot_id === lot.id)
      .reduce((sum, m) => sum + m.head_count, 0);
    const totalCost = (costs ?? [])
      .filter((c) => c.lot_id === lot.id)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const latestWeightKg = latest ? Number(latest.avg_weight_kg) : Number(lot.entry_avg_weight_kg);
    const latestWeighingDate = latest ? latest.weighed_at : null;
    const gmdKgPerDay = latest
      ? (latestWeightKg - Number(lot.entry_avg_weight_kg)) / daysBetween(lot.entry_date, latest.weighed_at)
      : null;
    const currentHeadCount = Math.max(0, lot.entry_head_count - totalMortality);
    const daysInLot = daysBetween(lot.entry_date, today);

    const target = lot.target_slaughter_weight_kg !== null ? Number(lot.target_slaughter_weight_kg) : null;
    const kgToTarget = target !== null ? target - latestWeightKg : null;
    let readiness: CattleLotReadiness = 'engordando';
    if (target !== null && kgToTarget !== null && kgToTarget <= 0) {
      readiness = 'pronto';
    } else if (daysInLot <= 30) {
      readiness = 'recem_chegado';
    }

    const estimatedArrobas =
      (latestWeightKg * currentHeadCount * (Number(lot.estimated_carcass_yield_pct) / 100)) / KG_PER_ARROBA;
    const projectedRevenue = estimatedArrobas * boiGordoPricePerArroba;
    const projectedMargin = projectedRevenue - totalCost;
    const costPerArroba = estimatedArrobas > 0 ? totalCost / estimatedArrobas : null;

    const estimatedExitDate =
      kgToTarget !== null && kgToTarget > 0 && gmdKgPerDay !== null && gmdKgPerDay > 0
        ? addDays(today, Math.ceil(kgToTarget / gmdKgPerDay))
        : null;

    return {
      ...lot,
      currentHeadCount,
      latestWeightKg,
      latestWeighingDate,
      gmdKgPerDay,
      mortalityRatePct: (totalMortality / lot.entry_head_count) * 100,
      daysInLot,
      readiness,
      kgToTarget,
      estimatedExitDate,
      totalCost,
      costPerHead: currentHeadCount > 0 ? totalCost / currentHeadCount : 0,
      costPerArroba,
      estimatedArrobas,
      projectedRevenue,
      projectedMargin,
    };
  });
}

/** Lotes de gado de corte de uma fazenda. */
export function useCattleLots(farmId: string | undefined) {
  const [lots, setLots] = useState<CattleLotSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_lots')
        .select('*')
        .eq('farm_id', farmId)
        .order('entry_date', { ascending: false });

      if (fetchError) throw fetchError;
      setLots(await withSummary(data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os lotes.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createLot = useCallback(
    async (input: {
      name: string;
      entry_head_count: number;
      entry_avg_weight_kg: number;
      entry_date?: string;
      plot_id?: string;
      target_slaughter_weight_kg?: number;
      estimated_carcass_yield_pct?: number;
    }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('cattle_lots').insert({
        farm_id: farmId,
        name: input.name,
        entry_head_count: input.entry_head_count,
        entry_avg_weight_kg: input.entry_avg_weight_kg,
        entry_date: input.entry_date || new Date().toISOString().slice(0, 10),
        plot_id: input.plot_id || null,
        target_slaughter_weight_kg: input.target_slaughter_weight_kg ?? null,
        estimated_carcass_yield_pct: input.estimated_carcass_yield_pct ?? 50,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  return { lots, isLoading, error, reload, createLot };
}

export function useCattleLot(lotId: string | undefined) {
  const [lot, setLot] = useState<CattleLotSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('cattle_lots').select('*').eq('id', lotId).single();
      if (fetchError) throw fetchError;
      const [summary] = await withSummary([data]);
      setLot(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o lote.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateTarget = useCallback(
    async (input: { target_slaughter_weight_kg?: number | null; estimated_carcass_yield_pct?: number }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };
      const { error: updateError } = await supabase
        .from('cattle_lots')
        .update({
          ...(input.target_slaughter_weight_kg !== undefined
            ? { target_slaughter_weight_kg: input.target_slaughter_weight_kg }
            : {}),
          ...(input.estimated_carcass_yield_pct !== undefined
            ? { estimated_carcass_yield_pct: input.estimated_carcass_yield_pct }
            : {}),
        })
        .eq('id', lotId);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [lotId, reload]
  );

  return { lot, isLoading, error, reload, updateTarget };
}
