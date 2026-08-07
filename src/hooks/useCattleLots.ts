import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleLot } from '../types/database';

export interface CattleLotSummary extends CattleLot {
  currentHeadCount: number;
  latestWeightKg: number;
  latestWeighingDate: string | null;
  gmdKgPerDay: number | null;
  mortalityRatePct: number;
}

function daysBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

async function withSummary(lots: CattleLot[]): Promise<CattleLotSummary[]> {
  if (lots.length === 0) return [];
  const lotIds = lots.map((l) => l.id);

  const [{ data: weighings, error: weighingsError }, { data: mortality, error: mortalityError }] =
    await Promise.all([
      supabase
        .from('cattle_lot_weighings')
        .select('lot_id, weighed_at, avg_weight_kg')
        .in('lot_id', lotIds)
        .order('weighed_at', { ascending: true }),
      supabase.from('cattle_mortality_events').select('lot_id, head_count').in('lot_id', lotIds),
    ]);

  if (weighingsError) throw weighingsError;
  if (mortalityError) throw mortalityError;

  return lots.map((lot) => {
    const lotWeighings = (weighings ?? []).filter((w) => w.lot_id === lot.id);
    const latest = lotWeighings[lotWeighings.length - 1];
    const totalMortality = (mortality ?? [])
      .filter((m) => m.lot_id === lot.id)
      .reduce((sum, m) => sum + m.head_count, 0);

    const latestWeightKg = latest ? Number(latest.avg_weight_kg) : Number(lot.entry_avg_weight_kg);
    const latestWeighingDate = latest ? latest.weighed_at : null;
    const gmdKgPerDay = latest
      ? (latestWeightKg - Number(lot.entry_avg_weight_kg)) / daysBetween(lot.entry_date, latest.weighed_at)
      : null;

    return {
      ...lot,
      currentHeadCount: Math.max(0, lot.entry_head_count - totalMortality),
      latestWeightKg,
      latestWeighingDate,
      gmdKgPerDay,
      mortalityRatePct: (totalMortality / lot.entry_head_count) * 100,
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
    }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('cattle_lots').insert({
        farm_id: farmId,
        name: input.name,
        entry_head_count: input.entry_head_count,
        entry_avg_weight_kg: input.entry_avg_weight_kg,
        entry_date: input.entry_date || new Date().toISOString().slice(0, 10),
        plot_id: input.plot_id || null,
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

  return { lot, isLoading, error, reload };
}
