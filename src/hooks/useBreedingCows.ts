import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { BreedingCow } from '../types/database';

/** Dias vazia (sem prenhez em curso) a partir dos quais a matriz vira
 * "atenção" — referência: intervalo entre partos ideal (~365 dias) menos a
 * gestação (~285 dias) dá uma janela de ~80 dias vazia esperada; passar
 * disso é sinal de repetição de cio ou problema reprodutivo. */
const ATTENTION_THRESHOLD_DAYS = 90;

/** Janela mínima pra fazer diagnóstico de gestação por ultrassom/palpação —
 * antes disso não dá pra confirmar, então a matriz fica "aguardando DG". */
const DIAGNOSIS_WINDOW_DAYS = 35;

export type ReproductiveStatus =
  | 'aguardando_dg'
  | 'prenha_confirmada'
  | 'prenha_presumida'
  | 'vazia'
  | 'vazia_atencao'
  | 'nunca_coberta';

export const REPRODUCTIVE_STATUS_LABELS: Record<ReproductiveStatus, string> = {
  aguardando_dg: 'Aguardando DG',
  prenha_confirmada: 'Prenha (DG confirmado)',
  prenha_presumida: 'Prenha (sem DG)',
  vazia: 'Vazia',
  vazia_atencao: 'Vazia há muito tempo',
  nunca_coberta: 'Nunca coberta',
};

export type CowCategory = 'novilha' | 'primipara' | 'multipara';

export const COW_CATEGORY_LABELS: Record<CowCategory, string> = {
  novilha: 'Novilha',
  primipara: 'Primípara',
  multipara: 'Multípara',
};

export interface BreedingCowSummary extends BreedingCow {
  calfCount: number;
  lastInseminationDate: string | null;
  expectedCalvingDate: string | null;
  isPregnant: boolean;
  reproductiveStatus: ReproductiveStatus;
  /** Dias desde o último parto/DG negativo sem nova prenhez — null se
   * prenha ou nunca coberta. */
  daysEmpty: number | null;
  totalCost: number;
  category: CowCategory;
  /** Média de dias entre partos consecutivos — null com menos de 2 partos. */
  avgCalvingIntervalDays: number | null;
  latestWeightKg: number | null;
  latestBodyConditionScore: number | null;
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
    { data: weighings, error: weighingsError },
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
    supabase
      .from('cow_weighings')
      .select('cow_id, weighed_at, weight_kg, body_condition_score')
      .in('cow_id', cowIds)
      .order('weighed_at', { ascending: false }),
  ]);

  if (calvingsError) throw calvingsError;
  if (inseminationsError) throw inseminationsError;
  if (costsError) throw costsError;
  if (weighingsError) throw weighingsError;

  const inseminationIds = (inseminations ?? []).map((i) => i.id);
  const { data: diagnoses, error: diagnosesError } =
    inseminationIds.length > 0
      ? await supabase
          .from('pregnancy_diagnoses')
          .select('insemination_id, diagnosis_date, result')
          .in('insemination_id', inseminationIds)
          .order('diagnosis_date', { ascending: false })
      : { data: [], error: null };
  if (diagnosesError) throw diagnosesError;

  return cows.map((cow) => {
    const cowCalvings = (calvings ?? []).filter((c) => c.cow_id === cow.id);
    const cowInseminations = (inseminations ?? []).filter((i) => i.cow_id === cow.id);
    const lastInsemination = cowInseminations[0];
    const lastDiagnosis = lastInsemination
      ? (diagnoses ?? []).find((d) => d.insemination_id === lastInsemination.id)
      : undefined;
    const matchingCalving = lastInsemination
      ? cowCalvings.find((c) => c.insemination_id === lastInsemination.id)
      : undefined;
    const totalCost = (costs ?? []).filter((c) => c.cow_id === cow.id).reduce((sum, c) => sum + Number(c.amount), 0);
    const cowWeighings = (weighings ?? []).filter((w) => w.cow_id === cow.id);
    const latestWeighing = cowWeighings[0];

    let reproductiveStatus: ReproductiveStatus;
    let isPregnant: boolean;
    let daysEmpty: number | null = null;

    if (!lastInsemination) {
      reproductiveStatus = 'nunca_coberta';
      isPregnant = false;
    } else if (matchingCalving) {
      isPregnant = false;
      daysEmpty = daysBetween(matchingCalving.calving_date, today);
      reproductiveStatus = daysEmpty > ATTENTION_THRESHOLD_DAYS ? 'vazia_atencao' : 'vazia';
    } else if (lastDiagnosis?.result === 'negativo' || lastDiagnosis?.result === 'reabsorcao') {
      isPregnant = false;
      daysEmpty = daysBetween(lastDiagnosis.diagnosis_date, today);
      reproductiveStatus = daysEmpty > ATTENTION_THRESHOLD_DAYS ? 'vazia_atencao' : 'vazia';
    } else if (lastDiagnosis?.result === 'positivo') {
      isPregnant = true;
      reproductiveStatus = 'prenha_confirmada';
    } else {
      // Sem diagnóstico ainda pra essa inseminação.
      const daysSinceInsemination = daysBetween(lastInsemination.insemination_date, today);
      isPregnant = true;
      reproductiveStatus = daysSinceInsemination < DIAGNOSIS_WINDOW_DAYS ? 'aguardando_dg' : 'prenha_presumida';
    }

    const category: CowCategory = cowCalvings.length === 0 ? 'novilha' : cowCalvings.length === 1 ? 'primipara' : 'multipara';

    let avgCalvingIntervalDays: number | null = null;
    if (cowCalvings.length >= 2) {
      const sortedAsc = [...cowCalvings].sort((a, b) => new Date(a.calving_date).getTime() - new Date(b.calving_date).getTime());
      const intervals: number[] = [];
      for (let i = 1; i < sortedAsc.length; i++) {
        intervals.push(daysBetween(sortedAsc[i - 1].calving_date, sortedAsc[i].calving_date));
      }
      avgCalvingIntervalDays = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
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
      category,
      avgCalvingIntervalDays,
      latestWeightKg: latestWeighing ? Number(latestWeighing.weight_kg) : null,
      latestBodyConditionScore: latestWeighing?.body_condition_score !== undefined && latestWeighing?.body_condition_score !== null
        ? Number(latestWeighing.body_condition_score)
        : null,
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
    async (input: { identification: string; birth_date?: string; notes?: string; dam_id?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('breeding_cows').insert({
        farm_id: farmId,
        identification: input.identification,
        birth_date: input.birth_date || null,
        notes: input.notes || null,
        dam_id: input.dam_id || null,
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

/** Genealogia leve de uma matriz — mãe (se cadastrada) e filhas que também
 * viraram matriz no rebanho. O pai/sêmen fica por inseminação
 * (inseminations.sire_or_semen), não aqui. */
export function useCowGenealogy(cow: BreedingCow | null | undefined) {
  const [dam, setDam] = useState<BreedingCow | null>(null);
  const [daughters, setDaughters] = useState<BreedingCow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!cow) {
      setDam(null);
      setDaughters([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      cow.dam_id
        ? supabase.from('breeding_cows').select('*').eq('id', cow.dam_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('breeding_cows').select('*').eq('dam_id', cow.id).order('identification', { ascending: true }),
    ]).then(([damResult, daughtersResult]) => {
      if (cancelled) return;
      setDam((damResult.data as BreedingCow | null) ?? null);
      setDaughters((daughtersResult.data as BreedingCow[] | null) ?? []);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cow]);

  return { dam, daughters, isLoading };
}
