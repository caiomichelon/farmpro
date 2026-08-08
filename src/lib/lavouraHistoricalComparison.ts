/** "Você, no passado" pra Lavoura — compara a produtividade (sacas/ha) da
 * safra mais recente do talhão com safras anteriores do mesmo talhão,
 * plantadas há aproximadamente 6 meses ou 1 ano. Mesma lógica da versão
 * de peso do Corte: só mostra a janela quando existe safra colhida real
 * dentro da tolerância. */

export interface SeasonInput {
  season_label: string;
  crop: string;
  planting_date: string | null;
  yieldPerHectare: number | null;
}

export interface LavouraHistoricalComparison {
  label: string;
  pastSeasonLabel: string;
  pastCrop: string;
  pastYield: number;
  pastDate: string;
  currentSeasonLabel: string;
  currentCrop: string;
  currentYield: number;
  deltaSacasPerHa: number;
  deltaPct: number;
}

const REFERENCE_WINDOWS: { label: string; days: number; toleranceDays: number }[] = [
  { label: '6 meses atrás', days: 182, toleranceDays: 30 },
  { label: '1 ano atrás', days: 365, toleranceDays: 45 },
];

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function buildLavouraHistoricalComparisons(seasons: SeasonInput[]): LavouraHistoricalComparison[] {
  const harvested = seasons.filter((s) => s.yieldPerHectare !== null && s.planting_date !== null);
  if (harvested.length < 2) return [];

  const sorted = [...harvested].sort(
    (a, b) => new Date(b.planting_date as string).getTime() - new Date(a.planting_date as string).getTime()
  );
  const latest = sorted[0];
  const results: LavouraHistoricalComparison[] = [];

  for (const window of REFERENCE_WINDOWS) {
    let best: SeasonInput | null = null;
    let bestDiff = Infinity;

    for (const s of sorted.slice(1)) {
      const gap = daysBetween(s.planting_date as string, latest.planting_date as string);
      const diff = Math.abs(gap - window.days);
      if (diff <= window.toleranceDays && diff < bestDiff) {
        best = s;
        bestDiff = diff;
      }
    }

    if (best) {
      const deltaSacasPerHa = Number(latest.yieldPerHectare) - Number(best.yieldPerHectare);
      results.push({
        label: window.label,
        pastSeasonLabel: best.season_label,
        pastCrop: best.crop,
        pastYield: Number(best.yieldPerHectare),
        pastDate: best.planting_date as string,
        currentSeasonLabel: latest.season_label,
        currentCrop: latest.crop,
        currentYield: Number(latest.yieldPerHectare),
        deltaSacasPerHa,
        deltaPct: (deltaSacasPerHa / Number(best.yieldPerHectare)) * 100,
      });
    }
  }

  return results;
}
