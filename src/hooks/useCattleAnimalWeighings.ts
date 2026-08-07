import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleAnimalWeighing } from '../types/database';

/** Pesagens de um animal individual. */
export function useCattleAnimalWeighings(animalId: string | undefined) {
  const [weighings, setWeighings] = useState<CattleAnimalWeighing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!animalId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_animal_weighings')
        .select('*')
        .eq('animal_id', animalId)
        .order('weighed_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWeighings(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as pesagens.');
    } finally {
      setIsLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createWeighing = useCallback(
    async (input: { weight_kg: number; body_condition_score?: number; weighed_at?: string; notes?: string }) => {
      if (!animalId) return { error: 'Animal não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_animal_weighings').insert({
        animal_id: animalId,
        weight_kg: input.weight_kg,
        body_condition_score: input.body_condition_score ?? null,
        weighed_at: input.weighed_at || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [animalId, reload]
  );

  return { weighings, isLoading, error, reload, createWeighing };
}
