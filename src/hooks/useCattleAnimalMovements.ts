import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleAnimalMovement } from '../types/database';

export interface CattleAnimalMovementWithNames extends CattleAnimalMovement {
  fromLotName: string | null;
  toLotName: string | null;
}

/** Histórico de movimentação de um animal entre lotes. */
export function useCattleAnimalMovements(animalId: string | undefined) {
  const [movements, setMovements] = useState<CattleAnimalMovementWithNames[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!animalId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_animal_movements')
        .select('*, from_lot:cattle_lots!from_lot_id(name), to_lot:cattle_lots!to_lot_id(name)')
        .eq('animal_id', animalId)
        .order('moved_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (CattleAnimalMovement & {
        from_lot: { name: string } | null;
        to_lot: { name: string } | null;
      })[];
      setMovements(
        rows.map((row) => ({ ...row, fromLotName: row.from_lot?.name ?? null, toLotName: row.to_lot?.name ?? null }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a movimentação.');
    } finally {
      setIsLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const moveToLot = useCallback(
    async (input: { from_lot_id: string | null; to_lot_id: string; moved_at?: string; notes?: string }) => {
      if (!animalId) return { error: 'Animal não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_animal_movements').insert({
        animal_id: animalId,
        from_lot_id: input.from_lot_id,
        to_lot_id: input.to_lot_id,
        moved_at: input.moved_at || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      const { error: updateError } = await supabase
        .from('cattle_animals')
        .update({ lot_id: input.to_lot_id })
        .eq('id', animalId);

      if (updateError) return { error: updateError.message };

      await reload();
      return { error: null };
    },
    [animalId, reload]
  );

  return { movements, isLoading, error, reload, moveToLot };
}
