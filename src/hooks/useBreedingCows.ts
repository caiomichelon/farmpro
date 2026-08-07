import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { BreedingCow } from '../types/database';

export interface BreedingCowSummary extends BreedingCow {
  calfCount: number;
}

async function withCalfCount(cows: BreedingCow[]): Promise<BreedingCowSummary[]> {
  if (cows.length === 0) return [];
  const { data, error } = await supabase
    .from('calvings')
    .select('cow_id, calf_count')
    .in(
      'cow_id',
      cows.map((c) => c.id)
    );

  if (error) throw error;

  return cows.map((cow) => ({
    ...cow,
    calfCount: (data ?? []).filter((c) => c.cow_id === cow.id).reduce((sum, c) => sum + c.calf_count, 0),
  }));
}

/** Matrizes (vacas reprodutoras) da fazenda — área de Cria/Reprodução. */
export function useBreedingCows(farmId: string | undefined) {
  const [cows, setCows] = useState<BreedingCowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('breeding_cows')
        .select('*')
        .eq('farm_id', farmId)
        .order('identification', { ascending: true });

      if (fetchError) throw fetchError;
      setCows(await withCalfCount(data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as matrizes.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCow = useCallback(
    async (input: { identification: string; birth_date?: string; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('breeding_cows').insert({
        farm_id: farmId,
        identification: input.identification,
        birth_date: input.birth_date || null,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  return { cows, isLoading, error, reload, createCow };
}

export function useBreedingCow(cowId: string | undefined) {
  const [cow, setCow] = useState<BreedingCowSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('breeding_cows')
        .select('*')
        .eq('id', cowId)
        .single();

      if (fetchError) throw fetchError;
      const [summary] = await withCalfCount([data]);
      setCow(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a matriz.');
    } finally {
      setIsLoading(false);
    }
  }, [cowId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cow, isLoading, error, reload };
}
