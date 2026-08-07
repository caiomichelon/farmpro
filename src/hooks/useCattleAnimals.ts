import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleAnimal, CattleAnimalSex } from '../types/database';

export interface CattleAnimalSummary extends CattleAnimal {
  latestWeightKg: number | null;
  latestWeighingDate: string | null;
  lotName?: string;
}

async function withLatestWeight(animals: CattleAnimal[]): Promise<CattleAnimalSummary[]> {
  if (animals.length === 0) return [];

  const { data: weighings, error } = await supabase
    .from('cattle_animal_weighings')
    .select('animal_id, weighed_at, weight_kg')
    .in(
      'animal_id',
      animals.map((a) => a.id)
    )
    .order('weighed_at', { ascending: true });

  if (error) throw error;

  return animals.map((animal) => {
    const animalWeighings = (weighings ?? []).filter((w) => w.animal_id === animal.id);
    const latest = animalWeighings[animalWeighings.length - 1];
    return {
      ...animal,
      latestWeightKg: latest ? Number(latest.weight_kg) : (animal.entry_weight_kg ?? null),
      latestWeighingDate: latest ? latest.weighed_at : null,
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
        .select('*')
        .eq('lot_id', lotId)
        .order('tag_number', { ascending: true });

      if (fetchError) throw fetchError;
      setAnimals(await withLatestWeight(data ?? []));
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
        .select('*, cattle_lots(name)')
        .eq('farm_id', farmId)
        .order('tag_number', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (CattleAnimal & { cattle_lots: { name: string } | null })[];
      const withWeights = await withLatestWeight(rows);
      setAnimals(withWeights.map((animal, i) => ({ ...animal, lotName: rows[i].cattle_lots?.name })));
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
        .select('*, cattle_lots(name)')
        .eq('id', animalId)
        .single();

      if (fetchError) throw fetchError;
      const row = data as unknown as CattleAnimal & { cattle_lots: { name: string } | null };
      const [summary] = await withLatestWeight([row]);
      setAnimal({ ...summary, lotName: row.cattle_lots?.name });
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
