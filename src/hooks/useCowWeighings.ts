import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CowWeighing } from '../types/database';

/** Pesagens/ECC de uma matriz — nutrição afeta reprodução diretamente,
 * é o indicador técnico mais básico de manejo de cria. */
export function useCowWeighings(cowId: string | undefined) {
  const [weighings, setWeighings] = useState<CowWeighing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cow_weighings')
        .select('*')
        .eq('cow_id', cowId)
        .order('weighed_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWeighings(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as pesagens.');
    } finally {
      setIsLoading(false);
    }
  }, [cowId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createWeighing = useCallback(
    async (input: { weight_kg: number; body_condition_score?: number; weighed_at?: string; notes?: string }) => {
      if (!cowId) return { error: 'Matriz não encontrada.' };

      const { error: insertError } = await supabase.from('cow_weighings').insert({
        cow_id: cowId,
        weight_kg: input.weight_kg,
        body_condition_score: input.body_condition_score ?? null,
        weighed_at: input.weighed_at || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [cowId, reload]
  );

  return { weighings, isLoading, error, reload, createWeighing };
}
