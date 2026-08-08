import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { RainReading } from '../types/database';

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export interface MonthlyRainTotal {
  month: string;
  totalMm: number;
}

/** Chuva lançada manualmente pela fazenda, mais recente primeiro — base do
 * acumulado por mês/safra. Uma leitura por dia (upsert por data, pra
 * corrigir sem duplicar se lançar duas vezes). */
export function useRainReadings(farmId: string | undefined) {
  const [readings, setReadings] = useState<RainReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('rain_readings')
        .select('*')
        .eq('farm_id', farmId)
        .order('reading_date', { ascending: false })
        .limit(180);

      if (fetchError) throw fetchError;
      setReadings(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a chuva lançada.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveReading = useCallback(
    async (input: { reading_date: string; mm: number }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      if (input.mm < 0) return { error: 'A chuva não pode ser negativa.' };

      const { error: upsertError } = await supabase
        .from('rain_readings')
        .upsert({ farm_id: farmId, reading_date: input.reading_date, mm: input.mm }, { onConflict: 'farm_id,reading_date' });

      if (upsertError) return { error: upsertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  const monthlyTotals = useMemo<MonthlyRainTotal[]>(() => {
    const totals = new Map<string, number>();
    for (const r of readings) {
      const key = monthKey(r.reading_date);
      totals.set(key, (totals.get(key) ?? 0) + Number(r.mm));
    }
    return Array.from(totals.entries())
      .map(([month, totalMm]) => ({ month, totalMm }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [readings]);

  const currentMonthTotalMm = monthlyTotals[0]?.month === monthKey(new Date().toISOString()) ? monthlyTotals[0].totalMm : 0;

  return { readings, monthlyTotals, currentMonthTotalMm, isLoading, error, reload, saveReading };
}
