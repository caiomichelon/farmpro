/** "Vender hoje ou esperar?" — compara o custo por arroba já lançado no
 * lote com a cotação vigente da arroba, pra lotes prontos pra abate. Só
 * sinaliza oportunidade quando a margem passa de um piso mínimo — não é
 * pra virar ruído diário, é pra ser o tipo de aviso que realmente vale a
 * pena parar pra ler. */

const GOOD_MARGIN_THRESHOLD_PCT = 15;

export interface SellRecommendationLotInput {
  id: string;
  name: string;
  readiness: 'recem_chegado' | 'engordando' | 'pronto';
  costPerArroba: number | null;
}

export interface SellRecommendation {
  lotId: string;
  lotName: string;
  costPerArroba: number;
  currentPrice: number;
  marginPct: number;
}

export function buildSellRecommendations(lots: SellRecommendationLotInput[], boiGordoPrice: number): SellRecommendation[] {
  if (boiGordoPrice <= 0) return [];

  return lots
    .filter((l) => l.readiness === 'pronto' && l.costPerArroba !== null && l.costPerArroba > 0)
    .map((l) => {
      const costPerArroba = l.costPerArroba as number;
      const marginPct = ((boiGordoPrice - costPerArroba) / costPerArroba) * 100;
      return { lotId: l.id, lotName: l.name, costPerArroba, currentPrice: boiGordoPrice, marginPct };
    })
    .filter((r) => r.marginPct >= GOOD_MARGIN_THRESHOLD_PCT)
    .sort((a, b) => b.marginPct - a.marginPct);
}
