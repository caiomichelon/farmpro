import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleAnimal, CattleAnimalSex } from '../types/database';
import { CATTLE_LOT_READINESS_LABELS, type CattleLotReadiness } from './useCattleLots';

export { CATTLE_LOT_READINESS_LABELS };
export type { CattleLotReadiness };

const RECENT_ARRIVAL_DAYS = 30;

export interface CattleAnimalSummary extends CattleAnimal {
  latestWeightKg: number | null;
  latestWeighingDate: string | null;
  lotName?: string;
  gmdKgPerDay: number | null;
  readiness: CattleLotReadiness;
  kgToTarget: number | null;
  hasOverdueHealth: boolean;
}

function daysBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

type LotTargetInfo = { name?: string; target_slaughter_weight_kg: number | null };

async function withDetails(
  animals: (CattleAnimal & { cattle_lots?: LotTargetInfo | null })[]
): Promise<CattleAnimalSummary[]> {
  if (animals.length === 0) return [];
  const today = new Date().toISOString().slice(0, 10);
  const animalIds = animals.map((a) => a.id);

  const [{ data: weighings, error: weighingsError }, { data: healthEvents, error: healthError }] = await Promise.all([
    supabase
      .from('cattle_animal_weighings')
      .select('animal_id, weighed_at, weight_kg')
      .in('animal_id', animalIds)
      .order('weighed_at', { ascending: true }),
    supabase
      .from('cattle_animal_health_events')
      .select('animal_id, next_due_date')
      .in('animal_id', animalIds)
      .not('next_due_date', 'is', null)
      .lt('next_due_date', today),
  ]);

  if (weighingsError) throw weighingsError;
  if (healthError) throw healthError;

  return animals.map((animal) => {
    const animalWeighings = (weighings ?? []).filter((w) => w.animal_id === animal.id);
    const latest = animalWeighings[animalWeighings.length - 1];
    const latestWeightKg = latest ? Number(latest.weight_kg) : (animal.entry_weight_kg ?? null);
    const latestWeighingDate = latest ? latest.weighed_at : null;

    const gmdKgPerDay =
      latest && animal.entry_weight_kg
        ? (Number(latest.weight_kg) - Number(animal.entry_weight_kg)) / daysBetween(animal.entry_date, latest.weighed_at)
        : null;

    const target = animal.cattle_lots?.target_slaughter_weight_kg ?? null;
    const kgToTarget = target !== null && latestWeightKg !== null ? target - latestWeightKg : null;
    const daysInLot = daysBetween(animal.entry_date, today);

    let readiness: CattleLotReadiness = 'engordando';
    if (target !== null && kgToTarget !== null && kgToTarget <= 0) {
      readiness = 'pronto';
    } else if (daysInLot <= RECENT_ARRIVAL_DAYS) {
      readiness = 'recem_chegado';
    }

    const hasOverdueHealth = (healthEvents ?? []).some((h) => h.animal_id === animal.id);

    return {
      ...animal,
      latestWeightKg,
      latestWeighingDate,
      lotName: animal.cattle_lots?.name,
      gmdKgPerDay,
      readiness,
      kgToTarget,
      hasOverdueHealth,
    };
  });
}

/** Animais individuais de um lote. */
export function useCattleAnimals(lotId: string | undefined) {
  const [animals, setAnimals] = useState<CattleAnimalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_animals')
        .select('*, cattle_lots(name, target_slaughter_weight_kg)')
        .eq('lot_id', lotId)
        .order('tag_number', { ascending: true });

      if (fetchError) throw fetchError;
      setAnimals(await withDetails((data ?? []) as never));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os animais.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createAnimal = useCallback(
    async (input: {
      farm_id: string;
      tag_number: string;
      sex?: CattleAnimalSex;
      breed?: string;
      entry_weight_kg?: number;
      entry_date?: string;
      notes?: string;
      official_id_number?: string;
    }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_animals').insert({
        farm_id: input.farm_id,
        lot_id: lotId,
        tag_number: input.tag_number,
        sex: input.sex || null,
        breed: input.breed || null,
        entry_weight_kg: input.entry_weight_kg ?? null,
        entry_date: input.entry_date || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
        official_id_number: input.official_id_number || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [lotId, reload]
  );

  return { animals, isLoading, error, reload, createAnimal };
}

/** Todos os animais da fazenda, com o nome do lote — a "planilha grande". */
export function useCattleAnimalsByFarm(farmId: string | undefined) {
  const [animals, setAnimals] = useState<CattleAnimalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_animals')
        .select('*, cattle_lots(name, target_slaughter_weight_kg)')
        .eq('farm_id', farmId)
        .order('tag_number', { ascending: true });

      if (fetchError) throw fetchError;
      setAnimals(await withDetails((data ?? []) as never));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os animais.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { animals, isLoading, error, reload };
}

export function useCattleAnimal(animalId: string | undefined) {
  const [animal, setAnimal] = useState<CattleAnimalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!animalId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_animals')
        .select('*, cattle_lots(name, target_slaughter_weight_kg)')
        .eq('id', animalId)
        .single();

      if (fetchError) throw fetchError;
      const [summary] = await withDetails([data as never]);
      setAnimal(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o animal.');
    } finally {
      setIsLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { animal, isLoading, error, reload };
}
