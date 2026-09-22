import { CATTLE_LOT_STATUS_LABELS } from '../data/cattleOptions';
import type { CattleLotSummary } from '../hooks/useCattleLots';
import { CATTLE_LOT_COST_CATEGORY_LABELS } from '../hooks/useCattleLotCosts';
import type { CattleSlaughterWithHouse } from '../hooks/useCattleSlaughters';
import type { CattleLotCost, CattleLotCostCategory } from '../types/database';

const KG_PER_ARROBA = 15;

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function currencyUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Formata um valor no formato/símbolo de moeda certo pra cada mercado —
 * BRL pro boi gordo brasileiro (B3, por @), USD pro novillo paraguaio
 * (mercado local cota em dólar por quilo vivo, não em arroba). */
function formatPrice(value: number, currencyCode: 'BRL' | 'USD'): string {
  return currencyCode === 'USD' ? currencyUSD(value) : currency(value);
}

function number(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export interface LotReportInput {
  farmName: string;
  city: string | null;
  state: string | null;
  generatedAt: Date;
  lot: CattleLotSummary;
  costs: CattleLotCost[];
  slaughters: CattleSlaughterWithHouse[];
  /** Preço por unidade (mesma unidade de lot.priceUnit) digitado à mão pelo
   * usuário, pra simular com um valor diferente da cotação automática — só
   * vale enquanto o lote está "ativo" (projeção); depois de abatido, o
   * relatório usa sempre o preço real já registrado no abate. */
  priceOverride?: number | null;
}

interface RealizedResult {
  totalHeadCount: number;
  totalArrobas: number;
  totalRevenue: number;
  avgExitWeightKg: number;
  avgPricePerArroba: number;
  lastSlaughterDate: string;
}

function computeRealizedResult(slaughters: CattleSlaughterWithHouse[], fallbackYieldPct: number): RealizedResult {
  const totalHeadCount = slaughters.reduce((sum, s) => sum + s.head_count, 0);
  const totalWeightKg = slaughters.reduce((sum, s) => sum + s.head_count * Number(s.exit_avg_weight_kg), 0);
  const totalArrobas = slaughters.reduce((sum, s) => {
    const yieldPct = s.carcass_yield_pct !== null ? Number(s.carcass_yield_pct) : fallbackYieldPct;
    return sum + (s.head_count * Number(s.exit_avg_weight_kg) * (yieldPct / 100)) / KG_PER_ARROBA;
  }, 0);
  const totalRevenue = slaughters.reduce((sum, s) => {
    const yieldPct = s.carcass_yield_pct !== null ? Number(s.carcass_yield_pct) : fallbackYieldPct;
    const arrobas = (s.head_count * Number(s.exit_avg_weight_kg) * (yieldPct / 100)) / KG_PER_ARROBA;
    return sum + arrobas * Number(s.price_per_arroba);
  }, 0);
  const lastSlaughterDate = slaughters
    .map((s) => s.slaughter_date)
    .sort()
    .reverse()[0];

  return {
    totalHeadCount,
    totalArrobas,
    totalRevenue,
    avgExitWeightKg: totalHeadCount > 0 ? totalWeightKg / totalHeadCount : 0,
    avgPricePerArroba: totalArrobas > 0 ? totalRevenue / totalArrobas : 0,
    lastSlaughterDate,
  };
}

/** Monta o HTML do relatório individual de um lote — layout visual, inspirado
 * num modelo de relatório de hotelaria/confinamento que o usuário mandou como
 * referência (faixa de cabeçalho, aviso, grade de dados do lote, custos,
 * retorno e um card de resultado em destaque). Enquanto o lote está "ativo"
 * o relatório é rotulado como projeção (peso e preço correntes); depois que
 * o lote é "abatido" ele vira resultado realizado, com os números de verdade
 * dos registros de abate — nunca mistura os dois rótulos. */
export function buildLotReportHtml(input: LotReportInput): string {
  const { farmName, city, state, generatedAt, lot, costs, slaughters, priceOverride } = input;
  const location = [city, state].filter(Boolean).join(' / ') || '—';
  const dateStr = generatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const isRealized = lot.status === 'abatido' && slaughters.length > 0;

  const realized = isRealized ? computeRealizedResult(slaughters, Number(lot.estimated_carcass_yield_pct)) : null;

  // Preço editado à mão substitui a cotação automática só na projeção — o
  // abate já registrado usa o preço real de venda, não faz sentido simular
  // em cima de um resultado que já aconteceu de verdade.
  const isPriceOverridden = !isRealized && priceOverride != null && priceOverride > 0;
  const effectivePricePerUnit = isPriceOverridden ? (priceOverride as number) : lot.pricePerUnit;

  const totalCost = lot.totalCost;

  const costsByCategory = new Map<CattleLotCostCategory, number>();
  for (const cost of costs) {
    costsByCategory.set(cost.category, (costsByCategory.get(cost.category) ?? 0) + Number(cost.amount));
  }
  const costRows = Array.from(costsByCategory.entries()).sort((a, b) => b[1] - a[1]);

  const bannerText = isRealized
    ? 'RESULTADO REALIZADO — valores com base nos abates já registrados deste lote.'
    : 'PROJEÇÃO — lote ainda ativo. Valores estimados com base no peso e na cotação atuais; podem mudar até o abate.';
  const bannerClass = isRealized ? 'banner-realized' : 'banner-projected';

  const exitWeightKg = realized ? realized.avgExitWeightKg : lot.latestWeightKg;
  const headCount = realized ? realized.totalHeadCount : lot.currentHeadCount;
  const exitDateLabel = realized ? formatDate(realized.lastSlaughterDate) : lot.estimatedExitDate ? formatDate(lot.estimatedExitDate) : '—';

  // O abate (cattle_slaughters) só tem campo de preço por arroba — por isso
  // o resultado "realizado" sempre sai em @ e em reais, mesmo pra lotes do
  // Paraguai; a cotação por quilo em dólar (novillo paraguaio) só entra
  // enquanto o lote ainda está "ativo" (projeção), lida direto da fazenda.
  const revenueCurrency: 'BRL' | 'USD' = realized ? 'BRL' : lot.priceCurrency;
  const revenueUnitLabel = realized ? '@' : lot.priceUnit;
  const quantityLabel = realized ? 'Arrobas produzidas' : lot.priceUnit === 'kg' ? 'Quilos vivos estimados' : 'Arrobas estimadas';
  const quantityValue = realized ? realized.totalArrobas : lot.priceUnit === 'kg' ? lot.latestWeightKg * lot.currentHeadCount : lot.estimatedArrobas;
  const priceLabel = realized ? 'Preço médio da arroba' : lot.priceUnit === 'kg' ? 'Preço médio do quilo' : 'Preço médio da arroba';
  const pricePerUnit = realized ? realized.avgPricePerArroba : effectivePricePerUnit;
  const totalRevenue = realized ? realized.totalRevenue : quantityValue * effectivePricePerUnit;
  const result = totalRevenue - totalCost;
  const resultPct = totalCost > 0 ? (result / totalCost) * 100 : 0;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1D2420; margin: 0; padding: 32px 40px; font-size: 12px; line-height: 1.5; }
  header { background: #243B2C; color: #F6F5F0; border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
  .brand { font-size: 22px; font-weight: bold; }
  .brand-sub { font-size: 11px; color: #C7D3C9; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 16px; margin: 0; }
  .doc-title p { margin: 2px 0 0; color: #C7D3C9; font-size: 11px; }
  .status-badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 999px; background: #F6F5F0; color: #243B2C; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
  .banner { border-radius: 8px; padding: 10px 16px; font-size: 11px; font-weight: 600; margin-bottom: 20px; }
  .banner-projected { background: #FBF0DB; color: #8A5A1F; border: 1px solid #EAD3A0; }
  .banner-realized { background: #E4F0E6; color: #2E5B3B; border: 1px solid #B9D9C1; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.4px; color: #243B2C; border-bottom: 1px solid #DFDBCC; padding-bottom: 6px; margin: 24px 0 12px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .stat { flex: 1 1 140px; border: 1px solid #DFDBCC; border-radius: 8px; padding: 10px 12px; }
  .stat .value { font-size: 17px; font-weight: bold; color: #1D2420; }
  .stat .label { font-size: 10px; color: #5B6259; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #EFEDE4; font-size: 11px; }
  th { color: #5B6259; font-weight: 600; }
  td.num, th.num { text-align: right; }
  .result-positive { color: #3F7A4E; }
  .result-negative { color: #A23B2E; }
  .profit-card { margin-top: 12px; border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
  .profit-card.positive { background: #E4F0E6; border: 1px solid #B9D9C1; }
  .profit-card.negative { background: #F4E1DD; border: 1px solid #E3B8AF; }
  .profit-card .label { font-size: 11px; color: #5B6259; text-transform: uppercase; letter-spacing: 0.4px; }
  .profit-card .value { font-size: 26px; font-weight: bold; margin-top: 4px; }
  .profit-card .pct { font-size: 20px; font-weight: bold; text-align: right; }
  .profit-card .pct-label { font-size: 10px; color: #5B6259; text-align: right; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #DFDBCC; font-size: 10px; color: #8A8F84; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="brand">${farmName}</div>
      <div class="brand-sub">${location}</div>
    </div>
    <div class="doc-title">
      <h1>Relatório do Lote — ${lot.name}</h1>
      <p>Gerado em ${dateStr}</p>
      <span class="status-badge">${CATTLE_LOT_STATUS_LABELS[lot.status]}</span>
    </div>
  </header>

  <div class="banner ${bannerClass}">${bannerText}</div>

  <h2>Dados do lote</h2>
  <div class="grid">
    <div class="stat"><div class="value">${formatDate(lot.entry_date)}</div><div class="label">Data de entrada</div></div>
    <div class="stat"><div class="value">${lot.entry_head_count}</div><div class="label">Cabeças na entrada</div></div>
    <div class="stat"><div class="value">${number(Number(lot.entry_avg_weight_kg))} kg</div><div class="label">Peso médio de entrada</div></div>
    <div class="stat"><div class="value">${headCount}</div><div class="label">${isRealized ? 'Cabeças abatidas' : 'Cabeças atuais'}</div></div>
    <div class="stat"><div class="value">${number(exitWeightKg)} kg</div><div class="label">${isRealized ? 'Peso médio de saída' : 'Peso médio atual'}</div></div>
    <div class="stat"><div class="value">${lot.gmdKgPerDay !== null ? `${number(lot.gmdKgPerDay, 2)} kg/dia` : '—'}</div><div class="label">GMD</div></div>
    <div class="stat"><div class="value">${lot.daysInLot}</div><div class="label">Dias em confinamento</div></div>
    <div class="stat"><div class="value">${number(lot.mortalityRatePct, 1)}%</div><div class="label">Mortalidade</div></div>
    <div class="stat"><div class="value">${exitDateLabel}</div><div class="label">${isRealized ? 'Data do abate' : 'Saída estimada'}</div></div>
  </div>

  <h2>Custos lançados</h2>
  ${
    costRows.length === 0
      ? '<p>Nenhum custo lançado neste lote até o momento.</p>'
      : `<table>
    <tr><th>Categoria</th><th class="num">Valor</th></tr>
    ${costRows.map(([category, amount]) => `<tr><td>${CATTLE_LOT_COST_CATEGORY_LABELS[category]}</td><td class="num">${currency(amount)}</td></tr>`).join('')}
    <tr><th>Total</th><th class="num">${currency(totalCost)}</th></tr>
  </table>`
  }

  <h2>${isRealized ? 'Receita realizada' : 'Receita projetada'}</h2>
  <table>
    <tr><th>${quantityLabel}</th><td class="num">${number(quantityValue, 1)} ${revenueUnitLabel}</td></tr>
    <tr><th>${priceLabel}${isPriceOverridden ? ' (editado)' : ''}</th><td class="num">${formatPrice(pricePerUnit, revenueCurrency)}</td></tr>
    <tr><th>Receita ${isRealized ? 'realizada' : 'projetada'}</th><td class="num">${formatPrice(totalRevenue, revenueCurrency)}</td></tr>
  </table>
  ${isPriceOverridden ? `<p style="font-size:11px;color:#8A5A1F;margin-top:4px;">⚠ Preço editado manualmente pelo usuário (cotação automática: ${formatPrice(lot.pricePerUnit, lot.priceCurrency)}) — só vale pra esta simulação.</p>` : ''}

  <div class="profit-card ${result >= 0 ? 'positive' : 'negative'}">
    <div>
      <div class="label">${isRealized ? 'Resultado final do lote' : 'Margem projetada do lote'}</div>
      <div class="value ${result >= 0 ? 'result-positive' : 'result-negative'}">${formatPrice(result, revenueCurrency)}</div>
    </div>
    <div>
      <div class="pct ${result >= 0 ? 'result-positive' : 'result-negative'}">${result >= 0 ? '+' : ''}${number(resultPct, 1)}%</div>
      <div class="pct-label">retorno sobre o custo</div>
    </div>
  </div>

  <footer>
    Relatório gerado automaticamente pelo FarmPro a partir dos lançamentos registrados no aplicativo.
    ${
      isRealized
        ? 'Valores de receita e retorno com base nos registros de abate deste lote.'
        : lot.priceUnit === 'kg'
          ? 'Valores de receita e retorno são projeções com base no peso atual do lote e na cotação vigente do novillo (Paraguai) — não são valores de venda já realizados. Os custos lançados podem estar em outra moeda (o app não registra a moeda de cada custo).'
          : 'Valores de receita e retorno são projeções com base no peso atual do lote e na cotação vigente da arroba — não são valores de venda já realizados.'
    }
  </footer>
</body>
</html>`;
}
