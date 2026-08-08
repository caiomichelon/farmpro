/**
 * Notícias do agronegócio pra tela de login — busca o RSS público do
 * Google Notícias (sem chave de API). Só texto simples, sem lib de parsing
 * XML nova: RSS é simples o bastante pra extrair com regex.
 *
 * ⚠️ Isso NÃO funciona no `expo start --web` (o feed não manda cabeçalho
 * de CORS, o navegador bloqueia) — funciona normal no app nativo (Expo
 * Go/build), onde fetch não passa por CORS. Por isso a falha é sempre
 * silenciosa: a seção de notícias some, a tela de login nunca quebra por
 * causa disso.
 */

const FEED_URL = 'https://news.google.com/rss/search?q=agronegocio&hl=pt-BR&gl=BR&ceid=BR:pt-419';
const FETCH_TIMEOUT_MS = 4000;

export interface AgroNewsItem {
  title: string;
  source: string;
  link: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export async function fetchAgroNews(limit = 4): Promise<AgroNewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(FEED_URL, { signal: controller.signal });
    if (!response.ok) return [];
    const xml = await response.text();

    const items: AgroNewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) && items.length < limit) {
      const block = match[1];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      if (!titleMatch || !linkMatch) continue;

      const rawTitle = decodeEntities(titleMatch[1].trim());
      const link = linkMatch[1].trim();
      // Google Notícias formata o título como "Manchete - Fonte".
      const separatorIndex = rawTitle.lastIndexOf(' - ');
      const title = separatorIndex > 0 ? rawTitle.slice(0, separatorIndex) : rawTitle;
      const source = separatorIndex > 0 ? rawTitle.slice(separatorIndex + 3) : '';
      items.push({ title, source, link });
    }
    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
