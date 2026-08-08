import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Supplier } from '../types/database';

/** Fornecedores / contatos úteis da fazenda — loja agropecuária,
 * veterinário, mecânico, transportadora, comprador etc. Lista simples pra
 * não precisar procurar telefone perdido. */
export function useSuppliers(farmId: string | undefined) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('farm_id', farmId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setSuppliers(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os fornecedores.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSupplier = useCallback(
    async (input: { name: string; category?: Supplier['category']; phone?: string; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      if (!input.name.trim()) return { error: 'Informe o nome do fornecedor.' };

      const { error: insertError } = await supabase.from('suppliers').insert({
        farm_id: farmId,
        name: input.name.trim(),
        category: input.category || 'outro',
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('suppliers').delete().eq('id', id);
      if (deleteError) return { error: deleteError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  return { suppliers, isLoading, error, reload, createSupplier, deleteSupplier };
}
