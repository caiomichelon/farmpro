import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleLotWeighing } from '../types/database';

/** Pesagens periódicas de um lote — base do GMD e do escore de condição corporal. */
export function useCattleLotWeighings(lotId: string | undefined) {
  const [weighings, setWeighings] = useState<CattleLotWeighing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_lot_weighings')
        .select('*')
        .eq('lot_id', lotId)
        .order('weighed_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWeighings(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as pesagens.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createWeighing = useCallback(
    async (input: {
      avg_weight_kg: number;
      head_count?: number;
      body_condition_score?: number;
      weighed_at?: string;
      notes?: string;
    }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_lot_weighings').insert({
        lot_id: lotId,
        avg_weight_kg: input.avg_weight_kg,
        head_count: input.head_count ?? null,
        body_condition_score: input.body_condition_score ?? null,
        weighed_at: input.weighed_at || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [lotId, reload]
  );

  return { weighings, isLoading, error, reload, createWeighing };
}
