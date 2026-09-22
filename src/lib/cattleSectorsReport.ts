function number(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export interface CattleSectorsReportInput {
  farmName: string;
  city: string | null;
  state: string | null;
  generatedAt: Date;
  semiHeadCount: number;
  semiActiveLotCount: number;
  groups: { sector_name: string; head_count: number; notes: string | null; updated_at: string }[];
}

/** Relatório-resumo de onde está cada grupo de gado da fazenda agora —
 * semi-confinamento (Corte) + todos os setores leves (pasto, proteico
 * etc.) num quadro só, fácil de olhar rápido ou mandar pra alguém. As
 * contagens são as que os usuários lançaram no app, não uma pesagem ou
 * contagem automática — isso fica avisado no rodapé, pra não parecer mais
 * preciso do que é. */
export function buildCattleSectorsReportHtml(input: CattleSectorsReportInput): string {
  const { farmName, city, state, generatedAt, semiHeadCount, semiActiveLotCount, groups } = input;
  const location = [city, state].filter(Boolean).join(' / ') || '—';
  const dateStr = generatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalHead = semiHeadCount + groups.reduce((sum, g) => sum + g.head_count, 0);

  const sectorCards = [
    `<div class="stat">
      <div class="stat-value">${number(semiHeadCount)}</div>
      <div class="stat-label">Semi-confinamento</div>
      <div class="stat-caption">${semiActiveLotCount} lote(s) ativo(s) no Corte</div>
    </div>`,
    ...groups.map(
      (g) => `<div class="stat">
      <div class="stat-value">${number(g.head_count)}</div>
      <div class="stat-label">${g.sector_name}</div>
      <div class="stat-caption">Atualizado em ${formatDate(g.updated_at)}${g.notes ? ` · ${g.notes}` : ''}</div>
    </div>`
    ),
  ].join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1D2420; margin: 0; padding: 32px 40px; font-size: 12px; line-height: 1.5; }
  header { background: #243B2C; color: #F6F5F0; border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: bold; }
  .brand-sub { font-size: 11px; color: #C7D3C9; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 16px; margin: 0; }
  .doc-title p { margin: 2px 0 0; color: #C7D3C9; font-size: 11px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.4px; color: #243B2C; border-bottom: 1px solid #DFDBCC; padding-bottom: 6px; margin: 24px 0 14px; }
  .grid { display: flex; flex-wrap: wrap; gap: 14px; }
  .stat { flex: 1 1 220px; border: 1px solid #DFDBCC; border-radius: 12px; padding: 18px 20px; background: #FAFAF7; }
  .stat-value { font-size: 34px; font-weight: bold; color: #243B2C; }
  .stat-label { font-size: 14px; font-weight: 600; color: #1D2420; margin-top: 4px; }
  .stat-caption { font-size: 10px; color: #5B6259; margin-top: 4px; }
  .total-card { margin-top: 20px; border-radius: 12px; padding: 20px 24px; background: #E4F0E6; border: 1px solid #B9D9C1; display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: #2E5B3B; }
  .total-value { font-size: 32px; font-weight: bold; color: #2E5B3B; margin-top: 4px; }
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
      <h1>Relatório de Setores do Gado</h1>
      <p>Gerado em ${dateStr}</p>
    </div>
  </header>

  <h2>Onde está cada grupo</h2>
  <div class="grid">
    ${sectorCards}
  </div>

  <div class="total-card">
    <div>
      <div class="total-label">Total de cabeças na fazenda</div>
      <div class="total-value">${number(totalHead)}</div>
    </div>
  </div>

  <footer>
    Relatório gerado automaticamente pelo FarmPro a partir das contagens lançadas por quem usa o aplicativo — não é uma
    pesagem nem contagem automática, é o número informado por último em cada setor.
  </footer>
</body>
</html>`;
}
