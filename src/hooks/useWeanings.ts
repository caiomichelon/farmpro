import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Weaning } from '../types/database';

/** Desmames ligados a um parto — peso e data em que o(s) bezerro(s) foram
 * desmamados. Um parto só pode ter um desmame (calving_id é a chave). */
export function useWeanings(calvingId: string | undefined) {
  const [weaning, setWeaning] = useState<Weaning | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!calvingId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('weanings')
        .select('*')
        .eq('calving_id', calvingId)
        .order('weaning_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setWeaning(data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o desmame.');
    } finally {
      setIsLoading(false);
    }
  }, [calvingId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createWeaning = useCallback(
    async (input: { weaning_date?: string; weight_kg?: number; notes?: string }) => {
      if (!calvingId) return { error: 'Parto não encontrado.' };

      const { error: insertError } = await supabase.from('weanings').insert({
        calving_id: calvingId,
        weaning_date: input.weaning_date || new Date().toISOString().slice(0, 10),
        weight_kg: input.weight_kg ?? null,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [calvingId, reload]
  );

  return { weaning, isLoading, error, reload, createWeaning };
}

/** Todos os desmames de uma fazenda (via lista de calving_ids conhecida) —
 * usado pra somar o resumo sem precisar entrar matriz por matriz. */
export async function fetchWeaningsByCalvingIds(calvingIds: string[]): Promise<Weaning[]> {
  if (calvingIds.length === 0) return [];
  const { data, error } = await supabase.from('weanings').select('*').in('calving_id', calvingIds);
  if (error) throw error;
  return data ?? [];
}
