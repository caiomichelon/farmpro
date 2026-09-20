// Busca o fechamento diário de Boi Gordo (BGI), Milho (CCM) e Soja (SJC) no
// arquivo público "TradeInformationConsolidatedFile" da B3 (sem chave, sem
// cadastro) e grava em public.commodity_quotes. Agendada via pg_cron (ver
// migration 0049) pra rodar todo dia útil, pouco depois do fechamento do
// pregão — a B3 não oferece cotação intradiária gratuita, só o fechamento
// do dia, então isso nunca vai ser "tempo real".
//
// Teste manual: curl -X POST https://<project>.supabase.co/functions/v1/sync-b3-quotes
// (função publicada com --no-verify-jwt, não precisa de Authorization).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const B3_REQUEST_URL = 'https://arquivos.b3.com.br/api/download/requestname';
const B3_DOWNLOAD_URL = 'https://arquivos.b3.com.br/api/download';
const FILE_NAME = 'TradeInformationConsolidatedFile';

// Códigos de mês padrão de futuros (BM&F usa o mesmo padrão da CME):
// F=jan G=fev H=mar J=abr K=mai M=jun N=jul Q=ago U=set V=out X=nov Z=dez.
const MONTH_CODE: Record<string, number> = {
  F: 1, G: 2, H: 3, J: 4, K: 5, M: 6, N: 7, Q: 8, U: 9, V: 10, X: 11, Z: 12,
};

interface CommoditySpec {
  id: string;
  label: string;
  prefix: string;
  unit: string;
  currency: 'BRL' | 'USD';
}

// Só essas três — são as únicas de boi/soja/milho/algodão que a B3 realmente
// negocia (algodão não tem contrato futuro ativo hoje). Soja é liquidada em
// dólar (contrato atrelado ao CME), por isso currency: 'USD'.
const COMMODITIES: CommoditySpec[] = [
  { id: 'boi-gordo', label: 'Boi Gordo', prefix: 'BGI', unit: '@', currency: 'BRL' },
  { id: 'milho', label: 'Milho', prefix: 'CCM', unit: 'saca 60kg', currency: 'BRL' },
  { id: 'soja', label: 'Soja', prefix: 'SJC', unit: 'saca 60kg', currency: 'USD' },
];

function todayInSaoPaulo(): string {
  // Locale en-CA formata como YYYY-MM-DD, que é o formato que a B3 espera.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function parseNum(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

interface FrontMonthMatch {
  ticker: string;
  price: number;
  changePercent: number;
  quoteDate: string;
}

/** Acha, entre as linhas já filtradas pro prefixo (ex.: "BGI"), o vencimento
 * mais próximo que teve negócio no dia (LastPric preenchido) — é o contrato
 * que qualquer pessoa chamaria de "o preço do boi hoje". */
function pickFrontMonth(prefix: string, rows: string[][], col: Record<string, number>): FrontMonthMatch | null {
  const re = new RegExp(`^${prefix}([FGHJKMNQUVXZ])(\\d{2})$`);
  let best: (FrontMonthMatch & { sortKey: number }) | null = null;

  for (const fields of rows) {
    const ticker = fields[col.TckrSymb];
    const match = ticker?.match(re);
    if (!match || fields[col.SgmtNm] !== 'AGRIBUSINESS') continue;

    const price = parseNum(fields[col.LastPric]);
    if (price === null) continue; // vencimento sem negócio nesse dia

    const month = MONTH_CODE[match[1]];
    const year = 2000 + Number(match[2]);
    const sortKey = year * 12 + month;
    if (best === null || sortKey < best.sortKey) {
      best = {
        ticker,
        price,
        changePercent: parseNum(fields[col.OscnPctg]) ?? 0,
        quoteDate: fields[col.RptDt],
        sortKey,
      };
    }
  }

  return best;
}

Deno.serve(async (req) => {
  // ?date=AAAA-MM-DD permite reprocessar um pregão específico manualmente
  // (backfill depois de uma falha, ou teste) — sem isso, sempre usa "hoje".
  const dateOverride = new URL(req.url).searchParams.get('date');
  const date = dateOverride ?? todayInSaoPaulo();

  try {
    const requestResp = await fetch(`${B3_REQUEST_URL}?fileName=${FILE_NAME}&date=${date}`);
    if (!requestResp.ok) {
      return json({ ok: false, skipped: true, reason: `requestname respondeu ${requestResp.status}`, date });
    }
    const requestJson = await requestResp.json().catch(() => null);
    const token = requestJson?.token;
    if (!token) {
      // Comum em fim de semana/feriado — a B3 não tem pregão nesse dia.
      return json({ ok: false, skipped: true, reason: 'sem token no retorno (provável dia sem pregão)', date });
    }

    const csvResp = await fetch(`${B3_DOWNLOAD_URL}?token=${token}`);
    if (!csvResp.ok) {
      return json({ ok: false, skipped: true, reason: `download respondeu ${csvResp.status}`, date });
    }
    const csvText = await csvResp.text();
    const lines = csvText.split('\n');

    const statusLine = lines[0] ?? '';
    if (!statusLine.includes('Final')) {
      return json({ ok: false, skipped: true, reason: `arquivo ainda não está "Final": "${statusLine.trim()}"`, date });
    }

    const header = (lines[1] ?? '').split(';');
    const col: Record<string, number> = {};
    header.forEach((name, i) => { col[name.trim()] = i; });
    const required = ['RptDt', 'TckrSymb', 'SgmtNm', 'LastPric', 'OscnPctg'];
    if (required.some((k) => !(k in col))) {
      return json({ ok: false, skipped: true, reason: 'layout do CSV mudou — colunas esperadas não encontradas', date, header });
    }

    // Filtra logo de cara pra não guardar as ~200 mil linhas do arquivo em
    // memória — só nos interessam linhas cujo ticker comece com um dos três
    // prefixos que a gente acompanha.
    const prefixes = COMMODITIES.map((c) => c.prefix);
    const rows: string[][] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const fields = line.split(';');
      const ticker = fields[col.TckrSymb];
      if (!ticker || !prefixes.some((p) => ticker.startsWith(p))) continue;
      rows.push(fields);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results: Record<string, unknown> = {};
    for (const spec of COMMODITIES) {
      const front = pickFrontMonth(spec.prefix, rows, col);
      if (!front) {
        results[spec.id] = { updated: false, reason: 'nenhum vencimento com negócio encontrado' };
        continue;
      }

      const { error } = await supabase.from('commodity_quotes').upsert({
        id: spec.id,
        label: spec.label,
        unit: spec.unit,
        currency: spec.currency,
        price: front.price,
        change_percent: front.changePercent,
        contract: front.ticker,
        quote_date: front.quoteDate,
        updated_at: new Date().toISOString(),
      });

      results[spec.id] = error ? { updated: false, error: error.message } : { updated: true, ...front };
    }

    return json({ ok: true, date, results });
  } catch (error) {
    return json({ ok: false, error: String(error), date }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
