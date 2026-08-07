import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { HarvestEntry } from '../types/database';

/** Acompanhamento de colheita em tempo real de uma safra (lançamentos por dia). */
export function useHarvestEntries(seasonId: string | undefined) {
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!seasonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('harvest_entries')
        .select('*')
        .eq('plot_season_id', seasonId)
        .order('harvested_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEntries(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a colheita.');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEntry = useCallback(
    async (input: { quantity_sacas: number; harvested_at?: string; notes?: string }) => {
      if (!seasonId) return { error: 'Safra não encontrada.' };

      const { error: insertError } = await supabase.from('harvest_entries').insert({
        plot_season_id: seasonId,
        quantity_sacas: input.quantity_sacas,
        harvested_at: input.harvested_at || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [seasonId, reload]
  );

  const totalSacas = entries.reduce((sum, e) => sum + Number(e.quantity_sacas), 0);
  const daysHarvesting = new Set(entries.map((e) => e.harvested_at)).size;

  return { entries, totalSacas, daysHarvesting, isLoading, error, reload, createEntry };
}
