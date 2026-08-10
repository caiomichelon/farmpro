import { useBreedingCows } from './useBreedingCows';
import { useCattleLots } from './useCattleLots';
import { useGrainRevenue } from './useGrainRevenue';
import { useSeasonsByFarm } from './usePlotSeasons';

/** Resultado financeiro consolidado da fazenda — mesma fórmula usada no
 * relatório pra banco: receita (Lavoura realizada + Corte projetado) menos
 * custo lançado (Lavoura + Corte + Cria). Extraído pra hook compartilhado
 * porque o cofrinho da meta usa exatamente o mesmo número. */
export function useConsolidatedResult(farmId: string | undefined) {
  const { lots, isLoading: lotsLoading } = useCattleLots(farmId);
  const { cows, isLoading: cowsLoading } = useBreedingCows(farmId);
  const { seasons, isLoading: seasonsLoading } = useSeasonsByFarm(farmId);
  const { revenue: grainRevenue, isLoading: revenueLoading } = useGrainRevenue(farmId);

  const isLoading = lotsLoading || cowsLoading || seasonsLoading || revenueLoading;
  const activeLots = lots.filter((l) => l.status === 'ativo');

  const lavouraCost = seasons.reduce((sum, s) => sum + s.totalCost, 0);
  const corteCost = activeLots.reduce((sum, l) => sum + l.totalCost, 0);
  const criaCost = cows.reduce((sum, c) => sum + c.totalCost, 0);
  const corteRevenue = activeLots.reduce((sum, l) => sum + l.projectedRevenue, 0);

  const totalCost = lavouraCost + corteCost + criaCost;
  const totalRevenue = grainRevenue + corteRevenue;
  const result = totalRevenue - totalCost;

  return { result, totalCost, totalRevenue, isLoading };
}
