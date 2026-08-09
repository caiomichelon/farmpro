const KG_PER_UA = 450;

export interface PastureLotInput {
  plot_id: string | null;
  currentHeadCount: number;
  latestWeightKg: number;
}

export interface PastureInput {
  id: string;
  name: string;
  area_hectares: number;
  max_stocking_rate_ua_ha: number | null;
}

export type PastureStockingLevel = 'sem_limite' | 'ok' | 'atencao' | 'acima';

export interface PastureStockingSummary {
  plot: PastureInput;
  headCount: number;
  totalUa: number;
  /** UA/ha — null quando o pasto não tem gado alocado ainda. */
  stockingRateUaHa: number | null;
  level: PastureStockingLevel;
}

/** Unidade Animal (UA) = peso vivo (kg) ÷ 450 — referência padrão zootécnica. */
export function calcUnidadeAnimal(weightKg: number): number {
  return weightKg / KG_PER_UA;
}

/** Agrupa lotes ativos por pasto e calcula a lotação (UA/ha) de cada um,
 * classificando contra o limite que o usuário configurou (sem limite
 * definido, nunca inventa um "número seguro" — só mostra o cálculo). */
export function computePastureStocking(pastures: PastureInput[], lots: PastureLotInput[]): PastureStockingSummary[] {
  return pastures.map((plot) => {
    const lotsInPlot = lots.filter((l) => l.plot_id === plot.id);
    const headCount = lotsInPlot.reduce((sum, l) => sum + l.currentHeadCount, 0);
    const totalUa = lotsInPlot.reduce((sum, l) => sum + calcUnidadeAnimal(l.latestWeightKg) * l.currentHeadCount, 0);
    const stockingRateUaHa = headCount > 0 ? totalUa / plot.area_hectares : null;

    let level: PastureStockingLevel = 'sem_limite';
    if (stockingRateUaHa !== null && plot.max_stocking_rate_ua_ha !== null) {
      if (stockingRateUaHa > plot.max_stocking_rate_ua_ha) {
        level = 'acima';
      } else if (stockingRateUaHa >= plot.max_stocking_rate_ua_ha * 0.85) {
        level = 'atencao';
      } else {
        level = 'ok';
      }
    }

    return { plot, headCount, totalUa, stockingRateUaHa, level };
  });
}
