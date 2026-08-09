import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { GrainBuyer } from '../types/database';

/** Compradores de grão (tradings/cerealistas) cadastrados na fazenda. */
export function useGrainBuyers(farmId: string | undefined) {
  const [buyers, setBuyers] = useState<GrainBuyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('grain_buyers')
        .select('*')
        .eq('farm_id', farmId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setBuyers(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os compradores.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createBuyer = useCallback(
    async (input: { name: string; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.', id: null };

      const { data, error: insertError } = await supabase
        .from('grain_buyers')
        .insert({
          farm_id: farmId,
          name: input.name,
          notes: input.notes || null,
        })
        .select('id')
        .single();

      if (insertError) return { error: insertError.message, id: null };

      await reload();
      return { error: null, id: data.id as string };
    },
    [farmId, reload]
  );

  return { buyers, isLoading, error, reload, createBuyer };
}

export interface BuyerRanking {
  buyerId: string;
  buyerName: string;
  totalSacas: number;
  averagePricePerSaca: number;
  totalValue: number;
  saleCount: number;
}

interface SaleWithRelations {
  quantity_sacas: number;
  price_per_saca: number;
  buyer_id: string | null;
  grain_buyers: { id: string; name: string } | null;
  plot_seasons: { plots: { farm_id: string } | null } | null;
}

/** Histórico de quem comprou e comparação de melhor comprador (preço médio
 * pago por saca), somando todas as safras da fazenda. */
export function useBuyerRanking(farmId: string | undefined) {
  const [ranking, setRanking] = useState<BuyerRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('grain_sales')
        .select(
          'quantity_sacas, price_per_saca, buyer_id, grain_buyers(id, name), plot_seasons!inner(plots!inner(farm_id))'
        )
        .eq('plot_seasons.plots.farm_id', farmId);

      if (fetchError) throw fetchError;

      const byBuyer = new Map<string, BuyerRanking>();
      for (const sale of (data ?? []) as unknown as SaleWithRelations[]) {
        if (!sale.buyer_id || !sale.grain_buyers) continue;
        const existing = byBuyer.get(sale.buyer_id) ?? {
          buyerId: sale.buyer_id,
          buyerName: sale.grain_buyers.name,
          totalSacas: 0,
          averagePricePerSaca: 0,
          totalValue: 0,
          saleCount: 0,
        };
        const saleValue = Number(sale.quantity_sacas) * Number(sale.price_per_saca);
        existing.totalSacas += Number(sale.quantity_sacas);
        existing.totalValue += saleValue;
        existing.saleCount += 1;
        byBuyer.set(sale.buyer_id, existing);
      }

      const results = Array.from(byBuyer.values())
        .map((r) => ({ ...r, averagePricePerSaca: r.totalSacas > 0 ? r.totalValue / r.totalSacas : 0 }))
        .sort((a, b) => b.averagePricePerSaca - a.averagePricePerSaca);

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
