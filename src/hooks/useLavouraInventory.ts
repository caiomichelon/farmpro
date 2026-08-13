import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type {
  LavouraInventoryCategory,
  LavouraInventoryItem,
  LavouraInventoryMovement,
  LavouraInventoryMovementType,
  LavouraInventoryUnit,
} from '../types/database';

export type LavouraInventoryStockStatus = 'ok' | 'baixo' | 'critico' | 'sem_alerta';

export const LAVOURA_INVENTORY_STOCK_STATUS_LABELS: Record<LavouraInventoryStockStatus, string> = {
  ok: 'Estoque ok',
  baixo: 'Estoque baixo',
  critico: 'Esgotado',
  sem_alerta: 'Sem mínimo definido',
};

export interface LavouraInventoryItemSummary extends LavouraInventoryItem {
  currentQuantity: number;
  stockStatus: LavouraInventoryStockStatus;
}

function computeStatus(currentQuantity: number, minQuantity: number | null): LavouraInventoryStockStatus {
  if (minQuantity === null) return 'sem_alerta';
  if (currentQuantity <= 0) return 'critico';
  if (currentQuantity <= minQuantity) return 'baixo';
  return 'ok';
}

/** Itens de estoque da Lavoura (sementes, fertilizante, defensivo,
 * combustível) — mesma lógica do estoque da Pecuária: quantidade atual
 * sempre calculada a partir do estoque inicial + movimentações. */
export function useLavouraInventoryItems(farmId: string | undefined) {
  const [items, setItems] = useState<LavouraInventoryItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: itemRows, error: itemsError } = await supabase
        .from('lavoura_inventory_items')
        .select('*')
        .eq('farm_id', farmId)
        .order('name', { ascending: true });

      if (itemsError) throw itemsError;

      const items = itemRows ?? [];
      if (items.length === 0) {
        setItems([]);
        return;
      }

      const { data: movementRows, error: movementsError } = await supabase
        .from('lavoura_inventory_movements')
        .select('item_id, type, quantity')
        .in(
          'item_id',
          items.map((i) => i.id)
        );

      if (movementsError) throw movementsError;

      setItems(
        items.map((item) => {
          const movements = (movementRows ?? []).filter((m) => m.item_id === item.id);
          const totalIn = movements.filter((m) => m.type === 'entrada').reduce((sum, m) => sum + Number(m.quantity), 0);
          const totalOut = movements.filter((m) => m.type === 'saida').reduce((sum, m) => sum + Number(m.quantity), 0);
          const currentQuantity = Number(item.initial_quantity) + totalIn - totalOut;
          const minQuantity = item.min_quantity !== null ? Number(item.min_quantity) : null;
          return {
            ...item,
            currentQuantity,
            stockStatus: computeStatus(currentQuantity, minQuantity),
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o estoque.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createItem = useCallback(
    async (input: {
      name: string;
      category: LavouraInventoryCategory;
      unit: LavouraInventoryUnit;
      initial_quantity?: number;
      min_quantity?: number;
      unit_cost?: number;
      notes?: string;
      supplier_id?: string;
      expiration_date?: string;
      photo_url?: string;
      location?: string;
    }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('lavoura_inventory_items').insert({
        farm_id: farmId,
        name: input.name,
        category: input.category,
        unit: input.unit,
        initial_quantity: input.initial_quantity ?? 0,
        min_quantity: input.min_quantity ?? null,
        unit_cost: input.unit_cost ?? null,
        notes: input.notes || null,
        supplier_id: input.supplier_id || null,
        expiration_date: input.expiration_date || null,
        photo_url: input.photo_url || null,
        location: input.location || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  return { items, isLoading, error, reload, createItem };
}

/** Um item de estoque só, com a mesma lógica de cálculo de quantidade atual. */
export function useLavouraInventoryItem(itemId: string | undefined) {
  const [item, setItem] = useState<LavouraInventoryItemSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!itemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: row, error: itemError } = await supabase
        .from('lavoura_inventory_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;

      const { data: movementRows, error: movementsError } = await supabase
        .from('lavoura_inventory_movements')
        .select('type, quantity')
        .eq('item_id', itemId);

      if (movementsError) throw movementsError;

      const totalIn = (movementRows ?? []).filter((m) => m.type === 'entrada').reduce((sum, m) => sum + Number(m.quantity), 0);
      const totalOut = (movementRows ?? []).filter((m) => m.type === 'saida').reduce((sum, m) => sum + Number(m.quantity), 0);
      const currentQuantity = Number(row.initial_quantity) + totalIn - totalOut;
      const minQuantity = row.min_quantity !== null ? Number(row.min_quantity) : null;

      setItem({ ...row, currentQuantity, stockStatus: computeStatus(currentQuantity, minQuantity) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o item.');
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { item, isLoading, error, reload };
}

export interface LavouraInventoryMovementWithSeason extends LavouraInventoryMovement {
  seasonLabel: string | null;
}

/** Histórico de entradas/saídas de um item, mais recente primeiro. */
export function useLavouraInventoryMovements(itemId: string | undefined) {
  const [movements, setMovements] = useState<LavouraInventoryMovementWithSeason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!itemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('lavoura_inventory_movements')
        .select('*, plot_seasons(season_label)')
        .eq('item_id', itemId)
        .order('moved_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (LavouraInventoryMovement & { plot_seasons: { season_label: string } | null })[];
      setMovements(rows.map((row) => ({ ...row, seasonLabel: row.plot_seasons?.season_label ?? null })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as movimentações.');
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createMovement = useCallback(
    async (input: { type: LavouraInventoryMovementType; quantity: number; plot_season_id?: string; notes?: string; moved_at?: string }) => {
      if (!itemId) return { error: 'Item não encontrado.' };

      const { error: insertError } = await supabase.from('lavoura_inventory_movements').insert({
        item_id: itemId,
        type: input.type,
        quantity: input.quantity,
        plot_season_id: input.plot_season_id || null,
        notes: input.notes || null,
        moved_at: input.moved_at || new Date().toISOString().slice(0, 10),
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [itemId, reload]
  );

  return { movements, isLoading, error, reload, createMovement };
}
