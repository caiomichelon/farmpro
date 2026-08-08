/**
 * "Ei FarmPro" — parser de comando de voz. Recebe o texto (já reconhecido
 * por voz na web, ou digitado como alternativa no nativo — Expo Go não traz
 * reconhecimento de fala nativo sem sair do Expo Go) e casa contra um
 * conjunto pequeno de intenções por palavra-chave. Sem LLM/API externa:
 * respostas curtas e previsíveis, faladas de volta via TTS.
 */

export interface VoiceCommandContext {
  readyLotNames: string[];
  weatherRiskTitles: string[];
  findLot: (spokenText: string) => { name: string; currentHeadCount: number; latestWeightKg: number } | null;
}

export interface VoiceCommandResult {
  reply: string;
  navigateTo?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function parseVoiceCommand(rawText: string, ctx: VoiceCommandContext): VoiceCommandResult {
  const text = normalize(rawText);

  if (includesAny(text, ['clima', 'tempo', 'previsao', 'chuva', 'geada'])) {
    if (ctx.weatherRiskTitles.length === 0) {
      return { reply: 'Sem riscos de clima previstos nos próximos dias.', navigateTo: 'clima' };
    }
    return { reply: `Atenção: ${ctx.weatherRiskTitles.join('. ')}.`, navigateTo: 'clima' };
  }

  if (includesAny(text, ['relatorio', 'banco', 'financiamento'])) {
    return { reply: 'Abrindo o relatório pra banco.', navigateTo: 'relatorio-bancario' };
  }

  if (includesAny(text, ['boletim'])) {
    return { reply: 'Abrindo o boletim de hoje.', navigateTo: 'boletim' };
  }

  if (includesAny(text, ['estoque', 'racao', 'nucleo'])) {
    return { reply: 'Abrindo o estoque.', navigateTo: 'pecuaria/estoque' };
  }

  if (includesAny(text, ['mensagem', 'funcionario', 'funcionarios'])) {
    return { reply: 'Abrindo funcionários.', navigateTo: 'funcionarios' };
  }

  if (includesAny(text, ['pronto', 'prontos', 'abate'])) {
    if (ctx.readyLotNames.length === 0) {
      return { reply: 'Nenhum lote pronto pra abate no momento.', navigateTo: 'pecuaria/corte/prontos-para-abate' };
    }
    return {
      reply: `${ctx.readyLotNames.length === 1 ? 'O lote' : 'Os lotes'} ${ctx.readyLotNames.join(', ')} ${
        ctx.readyLotNames.length === 1 ? 'está pronto' : 'estão prontos'
      } pra abate.`,
      navigateTo: 'pecuaria/corte/prontos-para-abate',
    };
  }

  if (includesAny(text, ['cabeca', 'cabecas', 'quantas'])) {
    const lot = ctx.findLot(text);
    if (!lot) return { reply: 'Não achei esse lote. Fala o nome do lote de novo?' };
    return { reply: `O lote ${lot.name} tem ${lot.currentHeadCount} cabeças.` };
  }

  if (includesAny(text, ['peso', 'pesando', 'quilos'])) {
    const lot = ctx.findLot(text);
    if (!lot) return { reply: 'Não achei esse lote. Fala o nome do lote de novo?' };
    return { reply: `O lote ${lot.name} está com peso médio de ${lot.latestWeightKg.toFixed(0)} quilos.` };
  }

  return { reply: 'Não entendi. Você pode perguntar sobre clima, lotes prontos, peso de um lote, ou pedir o boletim e o relatório.' };
}
