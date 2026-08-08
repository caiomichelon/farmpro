/** Monta o texto do boletim de voz diário — resumo falado do que importa
 * hoje na fazenda: alertas ativos, lotes prontos pra abate e partos
 * previstos pra semana. Texto corrido, pensado pra ser ouvido (não lido),
 * então frases curtas e sem abreviação. */

export interface BriefingAlertInput {
  title: string;
  severity: 'danger' | 'warning';
}

export interface BriefingInput {
  farmName: string;
  alerts: BriefingAlertInput[];
  readyLotNames: string[];
  upcomingCalvings: { identification: string; daysUntil: number }[];
  sellRecommendations: { lotName: string; marginPct: number }[];
}

function todayLabel(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function buildBriefingText(input: BriefingInput): string {
  const { farmName, alerts, readyLotNames, upcomingCalvings, sellRecommendations } = input;
  const parts: string[] = [];

  parts.push(`Bom dia! Aqui está o boletim de hoje, ${todayLabel()}, da ${farmName}.`);

  const dangerAlerts = alerts.filter((a) => a.severity === 'danger');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');

  if (dangerAlerts.length > 0) {
    parts.push(
      `Atenção: ${dangerAlerts.length} ${dangerAlerts.length === 1 ? 'alerta urgente' : 'alertas urgentes'}. ${dangerAlerts
        .slice(0, 3)
        .map((a) => a.title)
        .join('. ')}.`
    );
  }

  if (warningAlerts.length > 0) {
    parts.push(
      `Também tem ${warningAlerts.length} ${warningAlerts.length === 1 ? 'aviso' : 'avisos'}: ${warningAlerts
        .slice(0, 3)
        .map((a) => a.title)
        .join('. ')}.`
    );
  }

  if (dangerAlerts.length === 0 && warningAlerts.length === 0) {
    parts.push('Nenhum alerta pendente no momento.');
  }

  if (readyLotNames.length > 0) {
    parts.push(
      `${readyLotNames.length === 1 ? 'O lote' : 'Os lotes'} ${readyLotNames.join(', ')} ${
        readyLotNames.length === 1 ? 'está pronto' : 'estão prontos'
      } pra abate.`
    );
  }

  if (sellRecommendations.length > 0) {
    parts.push(
      `Boa notícia: hoje é um bom dia pra vender. ${sellRecommendations
        .map((r) => `${r.lotName}, com margem de ${r.marginPct.toFixed(0)} por cento`)
        .join('. ')}.`
    );
  }

  if (upcomingCalvings.length > 0) {
    const soon = upcomingCalvings.filter((c) => c.daysUntil <= 7);
    if (soon.length > 0) {
      parts.push(
        `${soon.length === 1 ? 'Tem um parto previsto' : `Tem ${soon.length} partos previstos`} pra essa semana: ${soon
          .map((c) => c.identification)
          .join(', ')}.`
      );
    }
  }

  parts.push('É isso. Bom trabalho hoje!');

  return parts.join(' ');
}
