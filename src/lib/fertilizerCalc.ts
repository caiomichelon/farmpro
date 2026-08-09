/** Calculadora de adubação — área × dose = quantidade total de fertilizante,
 * custo total (se o preço for informado) e, se a formulação NPK for
 * informada, quanto de cada nutriente (N, P2O5, K2O) isso representa.
 * Não recomenda dose nem formulação — só faz a conta a partir do que o
 * usuário já decidiu aplicar. */

export interface FertilizerCalcInput {
  areaHectares: number;
  doseKgPerHa: number;
  pricePerKg?: number;
  nPct?: number;
  p2o5Pct?: number;
  k2oPct?: number;
}

export interface FertilizerCalcResult {
  totalKg: number;
  totalCost: number | null;
  totalNKg: number | null;
  totalP2O5Kg: number | null;
  totalK2OKg: number | null;
}

export function calculateFertilizer(input: FertilizerCalcInput): FertilizerCalcResult | null {
  const { areaHectares, doseKgPerHa, pricePerKg, nPct, p2o5Pct, k2oPct } = input;
  if (areaHectares <= 0 || doseKgPerHa <= 0) return null;

  const totalKg = areaHectares * doseKgPerHa;

  return {
    totalKg,
    totalCost: pricePerKg !== undefined && pricePerKg > 0 ? totalKg * pricePerKg : null,
    totalNKg: nPct !== undefined && nPct > 0 ? totalKg * (nPct / 100) : null,
    totalP2O5Kg: p2o5Pct !== undefined && p2o5Pct > 0 ? totalKg * (p2o5Pct / 100) : null,
    totalK2OKg: k2oPct !== undefined && k2oPct > 0 ? totalKg * (k2oPct / 100) : null,
  };
}
