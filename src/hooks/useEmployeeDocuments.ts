import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { EmployeeDocument } from '../types/database';

/** Documentos de um funcionário — base dos alertas de documentação. */
export function useEmployeeDocuments(employeeId: string | undefined) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;
      setDocuments(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os documentos.');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createDocument = useCallback(
    async (input: {
      document_type: string;
      document_number?: string;
      issue_date?: string;
      expiry_date?: string;
      notes?: string;
    }) => {
      if (!employeeId) return { error: 'Funcionário não encontrado.' };

      const { error: insertError } = await supabase.from('employee_documents').insert({
        employee_id: employeeId,
        document_type: input.document_type,
        document_number: input.document_number || null,
        issue_date: input.issue_date || null,
        expiry_date: input.expiry_date || null,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [employeeId, reload]
  );

  return { documents, isLoading, error, reload, createDocument };
}
