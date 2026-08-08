/** "Você, X atrás" — compara o peso mais recente do lote com o peso mais
 * próximo de cada janela de referência (7, 30, 90 e 365 dias atrás). Só
 * mostra a janela quando existe pesagem real dentro da tolerância — nada
 * de inventar dado, se a fazenda ainda não tem histórico daquela época a
 * comparação simplesmente não aparece ainda. */

export interface WeighingInput {
  weighed_at: string;
  avg_weight_kg: number;
}

export interface HistoricalComparison {
  label: string;
  daysAgo: number;
  pastWeightKg: number;
  pastDate: string;
  currentWeightKg: number;
  deltaKg: number;
  deltaPct: number;
}

const REFERENCE_WINDOWS: { label: string; days: number; toleranceDays: number }[] = [
  { label: '7 dias atrás', days: 7, toleranceDays: 3 },
  { label: '30 dias atrás', days: 30, toleranceDays: 8 },
  { label: '90 dias atrás', days: 90, toleranceDays: 15 },
  { label: '1 ano atrás', days: 365, toleranceDays: 30 },
];

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function buildHistoricalComparisons(weighings: WeighingInput[]): HistoricalComparison[] {
  if (weighings.length < 2) return [];

  const sorted = [...weighings].sort((a, b) => new Date(b.weighed_at).getTime() - new Date(a.weighed_at).getTime());
  const latest = sorted[0];
  const results: HistoricalComparison[] = [];

  for (const window of REFERENCE_WINDOWS) {
    // Entre as pesagens anteriores, pega a mais próxima da janela alvo
    // (ex.: pra "30 dias atrás", a pesagem cujo intervalo até hoje mais se
    // aproxima de 30 dias, dentro da tolerância).
    let best: WeighingInput | null = null;
    let bestDiff = Infinity;

    for (const w of sorted.slice(1)) {
      const gap = daysBetween(w.weighed_at, latest.weighed_at);
      const diff = Math.abs(gap - window.days);
      if (diff <= window.toleranceDays && diff < bestDiff) {
        best = w;
        bestDiff = diff;
      }
    }

    if (best) {
      const deltaKg = Number(latest.avg_weight_kg) - Number(best.avg_weight_kg);
      results.push({
        label: window.label,
        daysAgo: window.days,
        pastWeightKg: Number(best.avg_weight_kg),
        pastDate: best.weighed_at,
        currentWeightKg: Number(latest.avg_weight_kg),
        deltaKg,
        deltaPct: (deltaKg / Number(best.avg_weight_kg)) * 100,
      });
    }
  }

  return results;
}
