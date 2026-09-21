/** "Vender hoje ou esperar?" — compara o custo lançado no lote com a
 * cotação vigente (arroba/BRL pro Brasil, quilo/USD pro Paraguai — cada
 * lote usa a cotação do próprio país, nunca mistura as duas), pra lotes
 * prontos pra abate. Só sinaliza oportunidade quando a margem passa de um
 * piso mínimo — não é pra virar ruído diário, é pra ser o tipo de aviso
 * que realmente vale a pena parar pra ler. */

const GOOD_MARGIN_THRESHOLD_PCT = 15;

export interface SellRecommendationLotInput {
  id: string;
  name: string;
  readiness: 'recem_chegado' | 'engordando' | 'pronto';
  costPerUnit: number | null;
  pricePerUnit: number;
  priceCurrency: 'BRL' | 'USD';
  priceUnit: '@' | 'kg';
}

export interface SellRecommendation {
  lotId: string;
  lotName: string;
  costPerUnit: number;
  currentPrice: number;
  priceCurrency: 'BRL' | 'USD';
  priceUnit: '@' | 'kg';
  marginPct: number;
}

export function buildSellRecommendations(lots: SellRecommendationLotInput[]): SellRecommendation[] {
  return lots
    .filter((l) => l.readiness === 'pronto' && l.costPerUnit !== null && l.costPerUnit > 0 && l.pricePerUnit > 0)
    .map((l) => {
      const costPerUnit = l.costPerUnit as number;
      const marginPct = ((l.pricePerUnit - costPerUnit) / costPerUnit) * 100;
      return {
        lotId: l.id,
        lotName: l.name,
        costPerUnit,
        currentPrice: l.pricePerUnit,
        priceCurrency: l.priceCurrency,
        priceUnit: l.priceUnit,
        marginPct,
      };
    })
    .filter((r) => r.marginPct >= GOOD_MARGIN_THRESHOLD_PCT)
    .sort((a, b) => b.marginPct - a.marginPct);
}
