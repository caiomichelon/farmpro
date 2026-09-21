// Busca o preço do novillo (gado a frigorífico) do Paraguai no site da
// Valor Agro (valoragro.com.py/mercados/) e grava em public.commodity_quotes
// como 'novillo-py'. O Paraguai não cota gado em arroba — é uma unidade só
// brasileira — o mercado de lá cota o "Ganado a frigorífico" em USD por
// quilo vivo, atualizado semanalmente (não é tempo real, nem diário).
//
// Sem API pública — a página é HTML simples (WordPress), então isso faz um
// parse com regex em cima da estrutura observada (tabela com spans
// "cat-mercados"/"result-mercados", categoria "Novillo"). Se o site mudar de
// layout, a função falha alto (não grava dado errado) em vez de adivinhar.
//
// Teste manual: curl -X POST https://<project>.supabase.co/functions/v1/sync-py-cattle-quotes
// (função publicada com --no-verify-jwt, não precisa de Authorization).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SOURCE_URL = 'https://www.valoragro.com.py/mercados/';

function parseNum(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

interface ParsedQuote {
  price: number;
  changePercent: number;
  quoteDate: string; // AAAA-MM-DD
}

/** Isola o bloco "Ganado a frigorífico" (do título até a linha de
 * "Última actualización" logo depois dele) e tira dali o preço "Novillo"
 * (semana atual, a segunda coluna de valor) e a data de atualização. */
function parseFrigorificoNovillo(html: string): ParsedQuote | null {
  const sectionStart = html.indexOf('Ganado a frigorífico');
  if (sectionStart === -1) return null;

  const dateMarker = 'Última actualización:';
  const dateMarkerIdx = html.indexOf(dateMarker, sectionStart);
  if (dateMarkerIdx === -1) return null;

  // Corta um pouco depois do marcador de data pra fechar o bloco da seção.
  const section = html.slice(sectionStart, dateMarkerIdx + 200);

  const categoryRe = /<span class="cat-mercados">Novillo<\/span>/;
  const categoryMatch = categoryRe.exec(section);
  if (!categoryMatch) return null;

  const resultRe = /<span class="result-mercados">\s*([\d.,]+)\s*<\/span>/g;
  resultRe.lastIndex = categoryMatch.index;
  const first = resultRe.exec(section); // semana anterior
  const second = resultRe.exec(section); // semana atual
  if (!second) return null;

  const price = parseNum(second[1]) ?? parseNum(first?.[1]);
  if (price === null) return null;

  const previousPrice = parseNum(first?.[1]);
  const changePercent = previousPrice && previousPrice !== 0 ? ((price - previousPrice) / previousPrice) * 100 : 0;

  const dateMatch = /Última actualización:\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(
    html.slice(dateMarkerIdx, dateMarkerIdx + 60)
  );
  if (!dateMatch) return null;
  const [, day, month, year] = dateMatch;
  const quoteDate = `${year}-${month}-${day}`;

  return { price, changePercent, quoteDate };
}

Deno.serve(async () => {
  try {
    const resp = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FarmProBot/1.0)' },
    });
    if (!resp.ok) {
      return json({ ok: false, skipped: true, reason: `valoragro respondeu ${resp.status}` });
    }
    const html = await resp.text();

    const parsed = parseFrigorificoNovillo(html);
    if (!parsed) {
      return json({ ok: false, skipped: true, reason: 'layout da página mudou — não achou o preço do Novillo' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('commodity_quotes').upsert({
      id: 'novillo-py',
      label: 'Novillo (Paraguai)',
      unit: 'kg',
      currency: 'USD',
      price: parsed.price,
      change_percent: parsed.changePercent,
      contract: null,
      quote_date: parsed.quoteDate,
      updated_at: new Date().toISOString(),
    });

    if (error) return json({ ok: false, error: error.message });

    return json({ ok: true, updated: true, ...parsed });
  } catch (error) {
    return json({ ok: false, error: String(error) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
