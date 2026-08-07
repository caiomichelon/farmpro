import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { ProductivityRecord } from '../types/database';

/** Histórico de produtividade de um funcionário. */
export function useProductivityRecords(employeeId: string | undefined) {
  const [records, setRecords] = useState<ProductivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('productivity_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('record_date', { ascending: false });

      if (fetchError) throw fetchError;
      setRecords(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a produtividade.');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createRecord = useCallback(
    async (input: { activity: string; quantity: number; unit: string; record_date?: string; notes?: string }) => {
      if (!employeeId) return { error: 'Funcionário não encontrado.' };

      const { error: insertError } = await supabase.from('productivity_records').insert({
        employee_id: employeeId,
        activity: input.activity,
        quantity: input.quantity,
        unit: input.unit,
        record_date: input.record_date || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [employeeId, reload]
  );

  return { records, isLoading, error, reload, createRecord };
}
