import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleSlaughter } from '../types/database';

export interface CattleSlaughterWithHouse extends CattleSlaughter {
  slaughterhouseName: string | null;
}

/** Registros de abate de um lote — frigorífico, data, indicadores de saída. */
export function useCattleSlaughters(lotId: string | undefined) {
  const [slaughters, setSlaughters] = useState<CattleSlaughterWithHouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_slaughters')
        .select('*, slaughterhouses(name)')
        .eq('lot_id', lotId)
        .order('slaughter_date', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (CattleSlaughter & { slaughterhouses: { name: string } | null })[];
      setSlaughters(rows.map((row) => ({ ...row, slaughterhouseName: row.slaughterhouses?.name ?? null })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os abates.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSlaughter = useCallback(
    async (input: {
      slaughterhouse_id?: string;
      head_count: number;
      exit_avg_weight_kg: number;
      price_per_arroba: number;
      carcass_yield_pct?: number;
      fat_finish_score?: number;
      feed_conversion_ratio?: number;
      slaughter_date?: string;
      next_slaughter_date?: string;
      notes?: string;
    }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_slaughters').insert({
        lot_id: lotId,
        slaughterhouse_id: input.slaughterhouse_id || null,
        head_count: input.head_count,
        exit_avg_weight_kg: input.exit_avg_weight_kg,
        price_per_arroba: input.price_per_arroba,
        carcass_yield_pct: input.carcass_yield_pct ?? null,
        fat_finish_score: input.fat_finish_score ?? null,
        feed_conversion_ratio: input.feed_conversion_ratio ?? null,
        slaughter_date: input.slaughter_date || new Date().toISOString().slice(0, 10),
        next_slaughter_date: input.next_slaughter_date || null,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      // Marca o lote como abatido.
      await supabase.from('cattle_lots').update({ status: 'abatido' }).eq('id', lotId);

      await reload();
      return { error: null };
    },
    [lotId, reload]
  );

  return { slaughters, isLoading, error, reload, createSlaughter };
}
