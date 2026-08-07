import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { BreedingCow } from '../types/database';

export interface BreedingCowSummary extends BreedingCow {
  calfCount: number;
  lastInseminationDate: string | null;
  expectedCalvingDate: string | null;
  isPregnant: boolean;
}

async function withSummary(cows: BreedingCow[]): Promise<BreedingCowSummary[]> {
  if (cows.length === 0) return [];
  const cowIds = cows.map((c) => c.id);

  const [{ data: calvings, error: calvingsError }, { data: inseminations, error: inseminationsError }] =
    await Promise.all([
      supabase.from('calvings').select('cow_id, calf_count, insemination_id').in('cow_id', cowIds),
      supabase
        .from('inseminations')
        .select('id, cow_id, insemination_date, expected_calving_date')
        .in('cow_id', cowIds)
        .order('insemination_date', { ascending: false }),
    ]);

  if (calvingsError) throw calvingsError;
  if (inseminationsError) throw inseminationsError;

  return cows.map((cow) => {
    const cowCalvings = (calvings ?? []).filter((c) => c.cow_id === cow.id);
    const cowInseminations = (inseminations ?? []).filter((i) => i.cow_id === cow.id);
    const lastInsemination = cowInseminations[0];
    const isPregnant = Boolean(lastInsemination) && !cowCalvings.some((c) => c.insemination_id === lastInsemination.id);

    return {
      ...cow,
      calfCount: cowCalvings.reduce((sum, c) => sum + c.calf_count, 0),
      lastInseminationDate: lastInsemination?.insemination_date ?? null,
      expectedCalvingDate: isPregnant ? (lastInsemination?.expected_calving_date ?? null) : null,
      isPregnant,
    };
  });
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
      setCows(await withSummary(data ?? []));
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
      const [summary] = await withSummary([data]);
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
