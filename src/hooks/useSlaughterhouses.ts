import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Slaughterhouse } from '../types/database';

/** Frigoríficos cadastrados na fazenda. */
export function useSlaughterhouses(farmId: string | undefined) {
  const [slaughterhouses, setSlaughterhouses] = useState<Slaughterhouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('slaughterhouses')
        .select('*')
        .eq('farm_id', farmId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setSlaughterhouses(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os frigoríficos.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSlaughterhouse = useCallback(
    async (input: { name: string; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('slaughterhouses').insert({
        farm_id: farmId,
        name: input.name,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  return { slaughterhouses, isLoading, error, reload, createSlaughterhouse };
}

export interface SlaughterhouseRanking {
  slaughterhouseId: string;
  slaughterhouseName: string;
  totalHead: number;
  totalArrobas: number;
  averagePricePerArroba: number;
  totalValue: number;
  eventCount: number;
  lastSlaughterDate: string | null;
  nextSlaughterDate: string | null;
}

interface SlaughterWithRelations {
  head_count: number;
  price_per_arroba: number;
  exit_avg_weight_kg: number;
  slaughter_date: string;
  next_slaughter_date: string | null;
  slaughterhouse_id: string | null;
  slaughterhouses: { id: string; name: string } | null;
  cattle_lots: { farm_id: string } | null;
}

/** Histórico de quantos animais cada frigorífico comprou, preço médio pago
 * por arroba, e ranking do melhor comprador — somando todos os lotes da
 * fazenda. */
export function useSlaughterhouseRanking(farmId: string | undefined) {
  const [ranking, setRanking] = useState<SlaughterhouseRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_slaughters')
        .select(
          'head_count, price_per_arroba, exit_avg_weight_kg, slaughter_date, next_slaughter_date, slaughterhouse_id, slaughterhouses(id, name), cattle_lots!inner(farm_id)'
        )
        .eq('cattle_lots.farm_id', farmId);

      if (fetchError) throw fetchError;

      const byHouse = new Map<string, SlaughterhouseRanking>();
      for (const sale of (data ?? []) as unknown as SlaughterWithRelations[]) {
        if (!sale.slaughterhouse_id || !sale.slaughterhouses) continue;
        const existing = byHouse.get(sale.slaughterhouse_id) ?? {
          slaughterhouseId: sale.slaughterhouse_id,
          slaughterhouseName: sale.slaughterhouses.name,
          totalHead: 0,
          totalArrobas: 0,
          averagePricePerArroba: 0,
          totalValue: 0,
          eventCount: 0,
          lastSlaughterDate: null,
          nextSlaughterDate: null,
        };
        // 1 arroba de carcaça = 15kg
        const arrobas = (Number(sale.exit_avg_weight_kg) * sale.head_count) / 15;
        const saleValue = arrobas * Number(sale.price_per_arroba);

        existing.totalHead += sale.head_count;
        existing.totalArrobas += arrobas;
        existing.totalValue += saleValue;
        existing.eventCount += 1;
        if (!existing.lastSlaughterDate || sale.slaughter_date > existing.lastSlaughterDate) {
          existing.lastSlaughterDate = sale.slaughter_date;
          existing.nextSlaughterDate = sale.next_slaughter_date;
        }
        byHouse.set(sale.slaughterhouse_id, existing);
      }

      const results = Array.from(byHouse.values())
        .map((r) => ({
          ...r,
          averagePricePerArroba: r.totalArrobas > 0 ? r.totalValue / r.totalArrobas : 0,
        }))
        .sort((a, b) => b.averagePricePerArroba - a.averagePricePerArroba);

      setRanking(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível montar a comparação.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ranking, isLoading, error, reload };
}
