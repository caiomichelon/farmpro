import { useMemo } from 'react';

import { computeFarmHealthScore, type FarmHealthBreakdown } from '../lib/farmHealthScore';
import { useConsolidatedResult } from './useConsolidatedResult';
import { useFarmAlerts, type FarmAlert } from './useFarmAlerts';

export interface FarmHealthScore extends FarmHealthBreakdown {
  alerts: FarmAlert[];
  isLoading: boolean;
  reload: () => void;
}

/** Nota de saúde da fazenda — junta os alertas abertos (useFarmAlerts) com
 * o mesmo resultado financeiro consolidado já usado no relatório pra banco
 * e no cofrinho da meta (useConsolidatedResult), pra não mostrar dois
 * números de "resultado da fazenda" diferentes em telas diferentes. */
export function useFarmHealthScore(farmId: string | undefined): FarmHealthScore {
  const { alerts, isLoading: isLoadingAlerts, reload: reloadAlerts } = useFarmAlerts(farmId);
  const { totalCost, totalRevenue, isLoading: isLoadingResult } = useConsolidatedResult(farmId);

  const breakdown = useMemo(
    () => computeFarmHealthScore({ alerts, totalCost, totalRevenue }),
    [alerts, totalCost, totalRevenue]
  );

  return {
    ...breakdown,
    alerts,
    isLoading: isLoadingAlerts || isLoadingResult,
    reload: reloadAlerts,
  };
}
