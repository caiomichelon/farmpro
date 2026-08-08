import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

/** Soma de venda de grão (quantidade × preço) por fazenda — não vem pronto
 * de nenhum hook existente, então busca direto aqui mesmo. Usado no
 * relatório pra banco e no cálculo de resultado consolidado (cofrinho da
 * meta). */
export function useGrainRevenue(farmId: string | undefined) {
  const [revenue, setRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    setIsLoading(true);
    supabase
      .from('grain_sales')
      .select('quantity_sacas, price_per_saca, plot_seasons!inner(plots!inner(farm_id))')
      .eq('plot_seasons.plots.farm_id', farmId)
      .then(({ data }) => {
        if (cancelled) return;
        const total = (data ?? []).reduce((sum, r) => sum + Number(r.quantity_sacas) * Number(r.price_per_saca), 0);
        setRevenue(total);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { revenue, isLoading };
}
