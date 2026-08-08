import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CasualLaborer } from '../types/database';

/** Diaristas avulsos — registro rápido de mão de obra temporária, sem
 * precisar passar pelo cadastro completo de funcionário. Farm-wide, útil
 * pros três setores (colheita, marcação, reforma de cerca etc.). */
export function useCasualLaborers(farmId: string | undefined) {
  const [laborers, setLaborers] = useState<CasualLaborer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('casual_laborers')
        .select('*')
        .eq('farm_id', farmId)
        .order('work_date', { ascending: false });

      if (fetchError) throw fetchError;
      setLaborers(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os diaristas.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createLaborer = useCallback(
    async (input: {
      worker_name: string;
      work_date?: string;
      sector?: CasualLaborer['sector'];
      task_description?: string;
      amount_paid: number;
      notes?: string;
    }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      if (!input.worker_name.trim()) return { error: 'Informe o nome do diarista.' };
      if (input.amount_paid == null || input.amount_paid < 0) return { error: 'Informe o valor pago.' };

      const { error: insertError } = await supabase.from('casual_laborers').insert({
        farm_id: farmId,
        worker_name: input.worker_name.trim(),
        work_date: input.work_date || new Date().toISOString().slice(0, 10),
        sector: input.sector || 'geral',
        task_description: input.task_description?.trim() || null,
        amount_paid: input.amount_paid,
        notes: input.notes?.trim() || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  const deleteLaborer = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('casual_laborers').delete().eq('id', id);
      if (deleteError) return { error: deleteError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  const totalPaid = laborers.reduce((sum, l) => sum + Number(l.amount_paid), 0);

  return { laborers, isLoading, error, reload, createLaborer, deleteLaborer, totalPaid };
}
