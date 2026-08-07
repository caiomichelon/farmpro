/**
 * Fonte de dados da barra de commodities.
 *
 * ⚠️ Os preços abaixo são estáticos/placeholder — o briefing pede cotação em
 * tempo real (boi gordo, soja, milho, algodão), mas isso depende de escolher
 * um provedor de dados (ex.: CEPEA/ESALQ, B3, ou uma cooperativa específica),
 * o que ainda não foi decidido. `getCommodityQuotes` é a única função que
 * precisa mudar quando essa integração entrar: troque o corpo por uma
 * chamada HTTP/websocket real, mantendo o formato de `CommodityQuote`.
 */

export type CommodityUnit = '@' | 'saca 60kg' | 'arroba' | '£';

export interface CommodityQuote {
  id: string;
  label: string;
  unit: CommodityUnit;
  price: number;
  changePercent: number;
  updatedAt: string;
}

const MOCK_QUOTES: CommodityQuote[] = [
  { id: 'boi-gordo', label: 'Boi Gordo', unit: '@', price: 298.5, changePercent: 0.42, updatedAt: new Date().toISOString() },
  { id: 'soja', label: 'Soja', unit: 'saca 60kg', price: 132.9, changePercent: -0.85, updatedAt: new Date().toISOString() },
  { id: 'milho', label: 'Milho', unit: 'saca 60kg', price: 62.4, changePercent: 1.15, updatedAt: new Date().toISOString() },
  { id: 'algodao', label: 'Algodão', unit: '£', price: 1.58, changePercent: -0.12, updatedAt: new Date().toISOString() },
];

export async function getCommodityQuotes(): Promise<CommodityQuote[]> {
  // TODO: substituir por integração real (ver aviso acima).
  return MOCK_QUOTES;
}
