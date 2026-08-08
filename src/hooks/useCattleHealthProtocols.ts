import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleHealthEventType, CattleHealthProtocol } from '../types/database';

/** Protocolos sanitários recorrentes da fazenda (ex.: "Aftosa" a cada 180
 * dias) — usados pra calcular a próxima dose sozinhos ao registrar um
 * evento de saúde de um animal. */
export function useCattleHealthProtocols(farmId: string | undefined) {
  const [protocols, setProtocols] = useState<CattleHealthProtocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_health_protocols')
        .select('*')
        .eq('farm_id', farmId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setProtocols(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os protocolos sanitários.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createProtocol = useCallback(
    async (input: { name: string; event_type: CattleHealthEventType; interval_days: number; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('cattle_health_protocols').insert({
        farm_id: farmId,
        name: input.name,
        event_type: input.event_type,
        interval_days: input.interval_days,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  const deleteProtocol = useCallback(
    async (protocolId: string) => {
      const { error: deleteError } = await supabase.from('cattle_health_protocols').delete().eq('id', protocolId);
      if (deleteError) return { error: deleteError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  return { protocols, isLoading, error, reload, createProtocol, deleteProtocol };
}
