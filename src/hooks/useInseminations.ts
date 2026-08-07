import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Insemination } from '../types/database';

/** Gestação média de bovino: ~283 dias. Usada só para sugerir a previsão de
 * parto — o campo fica editável, não é travado nesse cálculo. */
const AVERAGE_GESTATION_DAYS = 283;

export function estimateCalvingDate(inseminationDateIso: string): string {
  const date = new Date(`${inseminationDateIso}T00:00:00`);
  date.setDate(date.getDate() + AVERAGE_GESTATION_DAYS);
  return date.toISOString().slice(0, 10);
}

/** Inseminações de uma matriz — data, veterinário, previsão de parto. */
export function useInseminations(cowId: string | undefined) {
  const [inseminations, setInseminations] = useState<Insemination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('inseminations')
        .select('*')
        .eq('cow_id', cowId)
        .order('insemination_date', { ascending: false });

      if (fetchError) throw fetchError;
      setInseminations(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as inseminações.');
    } finally {
      setIsLoading(false);
    }
  }, [cowId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createInsemination = useCallback(
    async (input: {
      insemination_date?: string;
      veterinarian?: string;
      method?: string;
      sire_or_semen?: string;
      notes?: string;
    }) => {
      if (!cowId) return { error: 'Matriz não encontrada.' };

      const inseminationDate = input.insemination_date || new Date().toISOString().slice(0, 10);

      const { error: insertError } = await supabase.from('inseminations').insert({
        cow_id: cowId,
        insemination_date: inseminationDate,
        veterinarian: input.veterinarian || null,
        method: input.method || null,
        sire_or_semen: input.sire_or_semen || null,
        expected_calving_date: estimateCalvingDate(inseminationDate),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [cowId, reload]
  );

  return { inseminations, isLoading, error, reload, createInsemination };
}
