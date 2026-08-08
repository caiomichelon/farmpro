import { useCallback, useEffect, useState } from 'react';

import { enqueueMutation, isLikelyNetworkError } from '../lib/offlineQueue';
import { supabase } from '../lib/supabase';
import type { CattleFieldCollection, CattleFieldCollectionCategory, CattleFieldCollectionStatus } from '../types/database';

/** Coletas de campo de um lote — checagens rápidas de pasto/curral (foto +
 * GPS como evidência), mais recentes primeiro. */
export function useCattleFieldCollections(lotId: string | undefined) {
  const [collections, setCollections] = useState<CattleFieldCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_field_collections')
        .select('*')
        .eq('lot_id', lotId)
        .order('collected_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCollections(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as coletas de campo.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createCollection = useCallback(
    async (input: {
      category: CattleFieldCollectionCategory;
      status: CattleFieldCollectionStatus;
      notes?: string;
      photo_url?: string;
      latitude?: number;
      longitude?: number;
      location_accuracy_m?: number;
      head_count?: number;
      level_pct?: number;
    }) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const payload = {
        lot_id: lotId,
        category: input.category,
        status: input.status,
        notes: input.notes || null,
        photo_url: input.photo_url || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        location_accuracy_m: input.location_accuracy_m ?? null,
        head_count: input.head_count ?? null,
        level_pct: input.level_pct ?? null,
      };

      try {
        const { error: insertError } = await supabase.from('cattle_field_collections').insert(payload);
        if (insertError) {
          // Sem sinal no pasto — guarda localmente pra sincronizar depois,
          // em vez de perder a coleta.
          if (isLikelyNetworkError(insertError.message)) {
            await enqueueMutation('cattle_field_collections', payload);
            return { error: null, queued: true };
          }
          return { error: insertError.message };
        }
      } catch {
        await enqueueMutation('cattle_field_collections', payload);
        return { error: null, queued: true };
      }

      await reload();
      return { error: null, queued: false };
    },
    [lotId, reload]
  );

  return { collections, isLoading, error, reload, createCollection };
}

export interface LatestCollectionByLotAndCategory {
  [lotId: string]: {
    [category in CattleFieldCollectionCategory]?: CattleFieldCollection;
  };
}

/** Situação mais recente de cada categoria, por lote, pra montar o painel
 * de campo (grade lote × categoria) — uma consulta só pra fazenda inteira. */
export function useCattleFieldCollectionsByFarm(farmId: string | undefined) {
  const [latestByLot, setLatestByLot] = useState<LatestCollectionByLotAndCategory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_field_collections')
        .select('*, cattle_lots!inner(farm_id)')
        .eq('cattle_lots.farm_id', farmId)
        .order('collected_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as CattleFieldCollection[];
      const result: LatestCollectionByLotAndCategory = {};
      for (const row of rows) {
        if (!result[row.lot_id]) result[row.lot_id] = {};
        // Já vem ordenado por collected_at desc — a primeira ocorrência de
        // cada combinação lote+categoria é a mais recente.
        if (!result[row.lot_id][row.category]) result[row.lot_id][row.category] = row;
      }
      setLatestByLot(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o painel de campo.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { latestByLot, isLoading, error, reload };
}
