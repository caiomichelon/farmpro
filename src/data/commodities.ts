/**
 * Fonte de dados da barra de commodities — cotação de fechamento da B3
 * (Boi Gordo, Milho, Soja), sincronizada uma vez por dia útil por uma Edge
 * Function (supabase/functions/sync-b3-quotes) direto na tabela
 * public.commodity_quotes. Não é tempo real: a B3 não oferece cotação
 * intradiária gratuita pra terceiros, só o fechamento do pregão.
 *
 * Algodão não entra aqui porque a B3 não tem contrato futuro ativo dessa
 * commodity hoje — não dá pra fabricar esse dado, então fica de fora até
 * surgir uma fonte real.
 */
import { supabase } from '../lib/supabase';

export type CommodityUnit = '@' | 'saca 60kg';
export type CommodityCurrency = 'BRL' | 'USD';

export interface CommodityQuote {
  id: string;
  label: string;
  unit: CommodityUnit;
  currency: CommodityCurrency;
  price: number;
  changePercent: number;
  /** Data do pregão a que esse preço se refere (não "agora") — a tabela é o
   * fechamento do último dia útil processado. */
  quoteDate: string;
  updatedAt: string;
}

export async function getCommodityQuotes(): Promise<CommodityQuote[]> {
  const { data, error } = await supabase
    .from('commodity_quotes')
    .select('id, label, unit, currency, price, change_percent, quote_date, updated_at')
    .order('id');

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    label: row.label,
    unit: row.unit as CommodityUnit,
    currency: row.currency as CommodityCurrency,
    price: Number(row.price),
    changePercent: Number(row.change_percent),
    quoteDate: row.quote_date,
    updatedAt: row.updated_at,
  }));
}
