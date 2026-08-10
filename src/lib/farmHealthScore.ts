import type { FarmAlert } from '../hooks/useFarmAlerts';

export type HealthLevel = 'otimo' | 'bom' | 'atencao' | 'critico';

export interface FarmHealthBreakdown {
  score: number;
  level: HealthLevel;
  alertScore: number;
  /** null quando ainda não há nenhuma venda registrada (Lavoura + Corte) —
   * nesse caso não dá pra avaliar resultado financeiro de verdade, então a
   * nota não usa esse componente em vez de chutar um número. */
  financialScore: number | null;
  dangerCount: number;
  warningCount: number;
  totalCost: number;
  totalRevenue: number;
  margin: number;
}

const ALERT_WEIGHT = 0.45;
const FINANCIAL_WEIGHT = 0.55;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function levelFor(score: number): HealthLevel {
  if (score >= 80) return 'otimo';
  if (score >= 60) return 'bom';
  if (score >= 40) return 'atencao';
  return 'critico';
}

/**
 * Nota de saúde da fazenda (0-100) — não é um dado novo, é uma combinação
 * de dois sinais que o app já calcula em outro lugar, só que espalhados:
 *
 * 1. Alertas abertos (useFarmAlerts) — cada alerta de perigo pesa mais que
 *    um de atenção.
 * 2. O mesmo resultado financeiro consolidado (receita − custo de Lavoura,
 *    Corte e Cria) já usado no relatório pra banco e no cofrinho da meta —
 *    ver useConsolidatedResult.
 *
 * Enquanto não existe nenhuma venda lançada (Lavoura ou Corte — a Cria só
 * entra pelo lado do custo), o componente financeiro fica `null` — a nota
 * nesse caso é só o componente de alertas, em vez de mostrar uma nota
 * financeira chutada.
 */
export function computeFarmHealthScore(params: {
  alerts: FarmAlert[];
  totalCost: number;
  totalRevenue: number;
}): FarmHealthBreakdown {
  const { alerts, totalCost, totalRevenue } = params;

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const alertScore = clamp(100 - dangerCount * 15 - warningCount * 7, 0, 100);

  const margin = totalRevenue - totalCost;
  let financialScore: number | null = null;
  if (totalRevenue > 0) {
    if (totalCost <= 0) {
      // Receita sem custo lançado — toda ela é margem.
      financialScore = 100;
    } else {
      const marginRatio = clamp(margin / totalCost, -1, 1);
      financialScore = clamp(50 + marginRatio * 50, 0, 100);
    }
  }

  const score =
    financialScore !== null
      ? Math.round(financialScore * FINANCIAL_WEIGHT + alertScore * ALERT_WEIGHT)
      : Math.round(alertScore);

  return {
    score,
    level: levelFor(score),
    alertScore,
    financialScore,
    dangerCount,
    warningCount,
    totalCost,
    totalRevenue,
    margin,
  };
}
