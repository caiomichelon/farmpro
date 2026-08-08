import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { PregnancyDiagnosis, PregnancyDiagnosisResult } from '../types/database';

export const PREGNANCY_DIAGNOSIS_RESULT_LABELS: Record<PregnancyDiagnosisResult, string> = {
  positivo: 'Positivo',
  negativo: 'Negativo',
  reabsorcao: 'Reabsorção',
};

export const DIAGNOSIS_METHODS = ['Palpação', 'Ultrassom'];

/** Diagnósticos de gestação (DG) ligados a uma inseminação específica —
 * confirma ou descarta a prenhez sem precisar esperar o parto. */
export function usePregnancyDiagnoses(inseminationId: string | undefined) {
  const [diagnoses, setDiagnoses] = useState<PregnancyDiagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!inseminationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('pregnancy_diagnoses')
        .select('*')
        .eq('insemination_id', inseminationId)
        .order('diagnosis_date', { ascending: false });

      if (fetchError) throw fetchError;
      setDiagnoses(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os diagnósticos.');
    } finally {
      setIsLoading(false);
    }
  }, [inseminationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createDiagnosis = useCallback(
    async (input: { result: PregnancyDiagnosisResult; method?: string; diagnosis_date?: string; notes?: string }) => {
      if (!inseminationId) return { error: 'Inseminação não encontrada.' };

      const { error: insertError } = await supabase.from('pregnancy_diagnoses').insert({
        insemination_id: inseminationId,
        result: input.result,
        method: input.method || null,
        diagnosis_date: input.diagnosis_date || new Date().toISOString().slice(0, 10),
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [inseminationId, reload]
  );

  return { diagnoses, isLoading, error, reload, createDiagnosis };
}

/** Todos os diagnósticos de uma lista de inseminações — usado pra mostrar o
 * resultado ao lado de cada inseminação sem um hook por linha. */
export async function fetchDiagnosesByInseminationIds(inseminationIds: string[]): Promise<PregnancyDiagnosis[]> {
  if (inseminationIds.length === 0) return [];
  const { data, error } = await supabase
    .from('pregnancy_diagnoses')
    .select('*')
    .in('insemination_id', inseminationIds)
    .order('diagnosis_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
