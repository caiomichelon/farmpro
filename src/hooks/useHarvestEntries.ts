import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { HarvestEntry } from '../types/database';

/** Onde os lançamentos de colheita ficam amarrados — a uma safra específica
 * (seasonId, o jeito "organizado" por talhão) ou direto na fazenda (farmId,
 * pra quem só quer lançar sem se preocupar com talhão/safra). Exatamente um
 * dos dois deve vir preenchido. */
export interface HarvestTarget {
  seasonId?: string;
  farmId?: string;
}

/** Acompanhamento de colheita em tempo real (lançamentos por dia) — de uma
 * safra específica, ou soltos direto na fazenda quando não há talhão. */
export function useHarvestEntries({ seasonId, farmId }: HarvestTarget) {
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!seasonId && !farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase.from('harvest_entries').select('*');
      query = seasonId ? query.eq('plot_season_id', seasonId) : query.eq('farm_id', farmId as string);
      const { data, error: fetchError } = await query.order('harvested_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEntries(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a colheita.');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId, farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEntry = useCallback(
    async (input: {
      quantity_sacas: number;
      harvested_at?: string;
      notes?: string;
      truck_plate?: string;
      driver_name?: string;
      buyer_name?: string;
      gross_weight_kg?: number;
      raw_net_weight_kg?: number;
      net_weight_kg?: number;
      humidity_pct?: number;
      kg_per_saca?: number;
      photo_url?: string;
    }) => {
      if (!seasonId && !farmId) return { error: 'Fazenda não encontrada.', id: null };

      const { data, error: insertError } = await supabase
        .from('harvest_entries')
        .insert({
          plot_season_id: seasonId ?? null,
          farm_id: seasonId ? null : (farmId as string),
          quantity_sacas: input.quantity_sacas,
          harvested_at: input.harvested_at || new Date().toISOString().slice(0, 10),
          notes: input.notes || null,
          truck_plate: input.truck_plate || null,
          driver_name: input.driver_name || null,
          buyer_name: input.buyer_name || null,
          gross_weight_kg: input.gross_weight_kg ?? null,
          raw_net_weight_kg: input.raw_net_weight_kg ?? null,
          net_weight_kg: input.net_weight_kg ?? null,
          humidity_pct: input.humidity_pct ?? null,
          kg_per_saca: input.kg_per_saca ?? null,
          photo_url: input.photo_url || null,
        })
        .select('id')
        .single();

      if (insertError) return { error: insertError.message, id: null };

      await reload();
      return { error: null, id: data.id as string };
    },
    [seasonId, farmId, reload]
  );

  /** Completa/corrige uma nota já lançada — ex.: adicionar comprador e
   * umidade numa nota antiga que veio sem esses campos (de uma importação
   * de planilha que não tinha essas colunas, ou de antes do app capturar
   * isso). Só grava os campos passados; o resto da nota fica como estava. */
  const updateEntry = useCallback(
    async (
      id: string,
      input: {
        quantity_sacas?: number;
        harvested_at?: string;
        notes?: string | null;
        truck_plate?: string | null;
        driver_name?: string | null;
        buyer_name?: string | null;
        gross_weight_kg?: number | null;
        raw_net_weight_kg?: number | null;
        net_weight_kg?: number | null;
        humidity_pct?: number | null;
        kg_per_saca?: number | null;
        photo_url?: string | null;
      }
    ) => {
      const { error: updateError } = await supabase.from('harvest_entries').update(input).eq('id', id);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  const totalSacas = entries.reduce((sum, e) => sum + Number(e.quantity_sacas), 0);
  const daysHarvesting = new Set(entries.map((e) => e.harvested_at)).size;

  return { entries, totalSacas, daysHarvesting, isLoading, error, reload, createEntry, updateEntry };
}
