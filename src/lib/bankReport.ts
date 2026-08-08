import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function number(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export interface BankReportInput {
  farmName: string;
  city: string | null;
  state: string | null;
  generatedAt: Date;

  lavoura: {
    totalHectares: number;
    activeSeasonCount: number;
    totalPlantedHectares: number;
    totalHarvestedSacas: number;
    totalCost: number;
    totalRevenue: number;
  };

  corte: {
    activeLotCount: number;
    totalHeadCount: number;
    avgGmdKgPerDay: number | null;
    totalCost: number;
    projectedRevenue: number;
    projectedMargin: number;
  };

  cria: {
    totalCows: number;
    pregnantCount: number;
    totalCalvesBorn: number;
    totalCost: number;
  };

  funcionarios: {
    totalCount: number;
    countBySector: { label: string; count: number }[];
    totalMonthlyCost: number;
  };
}

/** Monta o HTML do relatório — layout formal, preto e branco, pensado pra
 * impressão/anexo em pedido de crédito rural (Plano Safra, Pronaf etc.),
 * bem diferente da planilha crua de exportação: aqui é texto corrido +
 * tabelas resumo, não um dump de cada registro. */
export function buildBankReportHtml(input: BankReportInput): string {
  const { farmName, city, state, generatedAt, lavoura, corte, cria, funcionarios } = input;
  const location = [city, state].filter(Boolean).join(' / ') || '—';
  const dateStr = generatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const consolidatedRevenue = lavoura.totalRevenue + corte.projectedRevenue;
  const consolidatedCost = lavoura.totalCost + corte.totalCost + cria.totalCost;
  const consolidatedResult = consolidatedRevenue - consolidatedCost;

  const pregnancyRatePct = cria.totalCows > 0 ? (cria.pregnantCount / cria.totalCows) * 100 : 0;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1D2420; margin: 0; padding: 32px 40px; font-size: 12px; line-height: 1.5; }
  header { border-bottom: 3px solid #243B2C; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 22px; font-weight: bold; color: #243B2C; }
  .brand-sub { font-size: 11px; color: #5B6259; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 16px; margin: 0; }
  .doc-title p { margin: 2px 0 0; color: #5B6259; font-size: 11px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.4px; color: #243B2C; border-bottom: 1px solid #DFDBCC; padding-bottom: 6px; margin: 28px 0 12px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
  .stat { flex: 1 1 140px; border: 1px solid #DFDBCC; border-radius: 8px; padding: 10px 12px; }
  .stat .value { font-size: 17px; font-weight: bold; color: #1D2420; }
  .stat .label { font-size: 10px; color: #5B6259; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #EFEDE4; font-size: 11px; }
  th { color: #5B6259; font-weight: 600; }
  .result-positive { color: #3F7A4E; font-weight: bold; }
  .result-negative { color: #A23B2E; font-weight: bold; }
  .summary-box { background: #F6F5F0; border: 1px solid #DFDBCC; border-radius: 8px; padding: 16px; margin-top: 12px; }
  footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #DFDBCC; font-size: 10px; color: #8A8F84; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="brand">FarmPro</div>
      <div class="brand-sub">Gestão técnica de lavoura e pecuária</div>
    </div>
    <div class="doc-title">
      <h1>Relatório de Gestão Técnica e Financeira</h1>
      <p>${farmName} — ${location}</p>
      <p>Gerado em ${dateStr}</p>
    </div>
  </header>

  <h2>Visão geral</h2>
  <div class="grid">
    <div class="stat"><div class="value">${number(lavoura.totalHectares)} ha</div><div class="label">Área total (Lavoura)</div></div>
    <div class="stat"><div class="value">${corte.totalHeadCount}</div><div class="label">Cabeças de gado de corte</div></div>
    <div class="stat"><div class="value">${cria.totalCows}</div><div class="label">Matrizes de cria</div></div>
    <div class="stat"><div class="value">${funcionarios.totalCount}</div><div class="label">Funcionários</div></div>
  </div>

  <h2>Lavoura</h2>
  <table>
    <tr><th>Safras ativas</th><td>${lavoura.activeSeasonCount}</td></tr>
    <tr><th>Área plantada</th><td>${number(lavoura.totalPlantedHectares, 1)} ha</td></tr>
    <tr><th>Total colhido</th><td>${number(lavoura.totalHarvestedSacas)} sacas</td></tr>
    <tr><th>Custo de produção lançado</th><td>${currency(lavoura.totalCost)}</td></tr>
    <tr><th>Receita de vendas de grão</th><td>${currency(lavoura.totalRevenue)}</td></tr>
    <tr><th>Resultado</th><td class="${lavoura.totalRevenue - lavoura.totalCost >= 0 ? 'result-positive' : 'result-negative'}">${currency(lavoura.totalRevenue - lavoura.totalCost)}</td></tr>
  </table>

  <h2>Pecuária — Corte</h2>
  <table>
    <tr><th>Lotes ativos</th><td>${corte.activeLotCount}</td></tr>
    <tr><th>Cabeças em engorda</th><td>${corte.totalHeadCount}</td></tr>
    <tr><th>GMD médio</th><td>${corte.avgGmdKgPerDay !== null ? `${number(corte.avgGmdKgPerDay, 2)} kg/dia` : '—'}</td></tr>
    <tr><th>Custo lançado</th><td>${currency(corte.totalCost)}</td></tr>
    <tr><th>Receita projetada (peso atual)</th><td>${currency(corte.projectedRevenue)}</td></tr>
    <tr><th>Margem projetada</th><td class="${corte.projectedMargin >= 0 ? 'result-positive' : 'result-negative'}">${currency(corte.projectedMargin)}</td></tr>
  </table>

  <h2>Pecuária — Cria</h2>
  <table>
    <tr><th>Matrizes no plantel</th><td>${cria.totalCows}</td></tr>
    <tr><th>Prenhas atualmente</th><td>${cria.pregnantCount} (${number(pregnancyRatePct, 1)}%)</td></tr>
    <tr><th>Bezerros nascidos (histórico)</th><td>${cria.totalCalvesBorn}</td></tr>
    <tr><th>Custo lançado</th><td>${currency(cria.totalCost)}</td></tr>
  </table>

  <h2>Funcionários</h2>
  <table>
    <tr><th>Total de funcionários</th><td>${funcionarios.totalCount}</td></tr>
    ${funcionarios.countBySector.map((s) => `<tr><th>${s.label}</th><td>${s.count}</td></tr>`).join('')}
    <tr><th>Custo de mão de obra (referência mensal)</th><td>${currency(funcionarios.totalMonthlyCost)}</td></tr>
  </table>

  <h2>Resumo financeiro consolidado</h2>
  <div class="summary-box">
    <table>
      <tr><th>Receita consolidada (Lavoura + Corte projetado)</th><td>${currency(consolidatedRevenue)}</td></tr>
      <tr><th>Custo consolidado (Lavoura + Corte + Cria)</th><td>${currency(consolidatedCost)}</td></tr>
      <tr><th>Resultado consolidado</th><td class="${consolidatedResult >= 0 ? 'result-positive' : 'result-negative'}">${currency(consolidatedResult)}</td></tr>
    </table>
  </div>

  <footer>
    Relatório gerado automaticamente pelo FarmPro a partir dos lançamentos registrados no aplicativo.
    Valores de receita da Pecuária — Corte são projeções com base no peso atual dos lotes e na cotação
    vigente da arroba, não valores de venda já realizados.
  </footer>
</body>
</html>`;
}

/** Gera o PDF a partir do HTML e compartilha (nativo) ou abre o diálogo de
 * impressão do navegador (web — não há como gerar um arquivo .pdf direto
 * no browser com o expo-print, então a saída ali é "Salvar como PDF" pela
 * própria caixa de impressão do sistema). */
export async function generateBankReportPdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Relatório para banco — FarmPro',
      UTI: 'com.adobe.pdf',
    });
  }
}
