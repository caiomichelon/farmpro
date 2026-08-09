import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { GrainSale } from '../types/database';
import type { HarvestTarget } from './useHarvestEntries';

export interface GrainSaleWithBuyer extends GrainSale {
  buyerName: string | null;
}

/** Vendas de grão de uma safra — lançada dentro da área de colheita — ou
 * soltas direto na fazenda quando não há talhão (ver HarvestTarget). */
export function useGrainSales({ seasonId, farmId }: HarvestTarget) {
  const [sales, setSales] = useState<GrainSaleWithBuyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!seasonId && !farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase.from('grain_sales').select('*, grain_buyers(name)');
      query = seasonId ? query.eq('plot_season_id', seasonId) : query.eq('farm_id', farmId as string);
      const { data, error: fetchError } = await query.order('sale_date', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (GrainSale & { grain_buyers: { name: string } | null })[];
      setSales(rows.map((row) => ({ ...row, buyerName: row.grain_buyers?.name ?? null })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as vendas.');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId, farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSale = useCallback(
    async (input: {
      buyer_id?: string;
      quantity_sacas: number;
      price_per_saca: number;
      sale_date?: string;
      notes?: string;
      photo_url?: string;
      truck_plate?: string;
      carrier_name?: string;
      freight_cost?: number;
      harvest_entry_id?: string;
    }) => {
      if (!seasonId && !farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('grain_sales').insert({
        plot_season_id: seasonId ?? null,
        farm_id: seasonId ? null : (farmId as string),
        buyer_id: input.buyer_id || null,
        quantity_sacas: input.quantity_sacas,
        price_per_saca: input.price_per_saca,
        sale_date: input.sale_date || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
        photo_url: input.photo_url || null,
        truck_plate: input.truck_plate || null,
        carrier_name: input.carrier_name || null,
        freight_cost: input.freight_cost ?? null,
        harvest_entry_id: input.harvest_entry_id || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [seasonId, farmId, reload]
  );

  const totalSacasSold = sales.reduce((sum, s) => sum + Number(s.quantity_sacas), 0);
  const totalValue = sales.reduce((sum, s) => sum + Number(s.quantity_sacas) * Number(s.price_per_saca), 0);
  const totalFreight = sales.reduce((sum, s) => sum + (s.freight_cost !== null ? Number(s.freight_cost) : 0), 0);
  const netValue = totalValue - totalFreight;

  return { sales, totalSacasSold, totalValue, totalFreight, netValue, isLoading, error, reload, createSale };
}
