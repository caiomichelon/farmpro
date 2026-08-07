import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Calving } from '../types/database';

/** Partos de uma matriz — histórico de quantos bezerros ela já deu. */
export function useCalvings(cowId: string | undefined) {
  const [calvings, setCalvings] = useState<Calving[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('calvings')
        .select('*')
        .eq('cow_id', cowId)
        .order('calving_date', { ascending: false });

      if (fetchError) throw fetchError;
      setCalvings(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os partos.');
    } finally {
      setIsLoading(false);
    }
  }, [cowId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCalving = useCallback(
    async (input: {
      insemination_id?: string;
      calving_date?: string;
      calf_count?: number;
      calf_identification?: string;
      notes?: string;
    }) => {
      if (!cowId) return { error: 'Matriz não encontrada.' };

      const { error: insertError } = await supabase.from('calvings').insert({
        cow_id: cowId,
        insemination_id: input.insemination_id || null,
        calving_date: input.calving_date || new Date().toISOString().slice(0, 10),
        calf_count: input.calf_count ?? 1,
        calf_identification: input.calf_identification || null,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [cowId, reload]
  );

  return { calvings, isLoading, error, reload, createCalving };
}
