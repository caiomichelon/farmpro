import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { BreedingCow } from '../types/database';

/** Dias vazia (sem prenhez em curso) a partir dos quais a matriz vira
 * "atenção" — referência: intervalo entre partos ideal (~365 dias) menos a
 * gestação (~285 dias) dá uma janela de ~80 dias vazia esperada; passar
 * disso é sinal de repetição de cio ou problema reprodutivo. */
const ATTENTION_THRESHOLD_DAYS = 90;

export type ReproductiveStatus = 'prenha' | 'vazia' | 'vazia_atencao' | 'nunca_coberta';

export const REPRODUCTIVE_STATUS_LABELS: Record<ReproductiveStatus, string> = {
  prenha: 'Prenha',
  vazia: 'Vazia',
  vazia_atencao: 'Vazia há muito tempo',
  nunca_coberta: 'Nunca coberta',
};

export interface BreedingCowSummary extends BreedingCow {
  calfCount: number;
  lastInseminationDate: string | null;
  expectedCalvingDate: string | null;
  isPregnant: boolean;
  reproductiveStatus: ReproductiveStatus;
  /** Dias desde o último parto/inseminação sem nova prenhez — null se
   * prenha ou nunca coberta. */
  daysEmpty: number | null;
  totalCost: number;
}

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

async function withSummary(cows: BreedingCow[]): Promise<BreedingCowSummary[]> {
  if (cows.length === 0) return [];
  const cowIds = cows.map((c) => c.id);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: calvings, error: calvingsError },
    { data: inseminations, error: inseminationsError },
    { data: costs, error: costsError },
  ] = await Promise.all([
    supabase
      .from('calvings')
      .select('cow_id, calf_count, insemination_id, calving_date')
      .in('cow_id', cowIds)
      .order('calving_date', { ascending: false }),
    supabase
      .from('inseminations')
      .select('id, cow_id, insemination_date, expected_calving_date')
      .in('cow_id', cowIds)
      .order('insemination_date', { ascending: false }),
    supabase.from('breeding_cow_costs').select('cow_id, amount').in('cow_id', cowIds),
  ]);

  if (calvingsError) throw calvingsError;
  if (inseminationsError) throw inseminationsError;
  if (costsError) throw costsError;

  return cows.map((cow) => {
    const cowCalvings = (calvings ?? []).filter((c) => c.cow_id === cow.id);
    const cowInseminations = (inseminations ?? []).filter((i) => i.cow_id === cow.id);
    const lastInsemination = cowInseminations[0];
    const lastCalving = cowCalvings[0];
    const isPregnant = Boolean(lastInsemination) && !cowCalvings.some((c) => c.insemination_id === lastInsemination.id);
    const totalCost = (costs ?? []).filter((c) => c.cow_id === cow.id).reduce((sum, c) => sum + Number(c.amount), 0);

    let reproductiveStatus: ReproductiveStatus;
    let daysEmpty: number | null = null;

    if (isPregnant) {
      reproductiveStatus = 'prenha';
    } else if (!lastInsemination) {
      reproductiveStatus = 'nunca_coberta';
    } else {
      // Não prenha e já foi coberta antes: o último evento (parto, se
      // teve, senão a própria inseminação) marca o início da janela vazia.
      const referenceDate = lastCalving?.calving_date ?? lastInsemination.insemination_date;
      daysEmpty = daysBetween(referenceDate, today);
      reproductiveStatus = daysEmpty > ATTENTION_THRESHOLD_DAYS ? 'vazia_atencao' : 'vazia';
    }

    return {
      ...cow,
      calfCount: cowCalvings.reduce((sum, c) => sum + c.calf_count, 0),
      lastInseminationDate: lastInsemination?.insemination_date ?? null,
      expectedCalvingDate: isPregnant ? (lastInsemination?.expected_calving_date ?? null) : null,
      isPregnant,
      reproductiveStatus,
      daysEmpty,
      totalCost,
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
