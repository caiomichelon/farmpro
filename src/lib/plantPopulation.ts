/** Calculadora de população de plantas (estande) — a partir do espaçamento
 * entre linhas, sementes por metro linear e germinação esperada, calcula a
 * população final (plantas/ha) e quantas sementes são necessárias pra área
 * plantada. Confere se o estande vai sair no esperado antes de plantar. */

export interface PlantPopulationInput {
  rowSpacingCm: number;
  seedsPerMeter: number;
  germinationPct: number;
  areaHectares: number;
}

export interface PlantPopulationResult {
  linearMetersPerHectare: number;
  grossSeedsPerHectare: number;
  finalPopulationPerHectare: number;
  totalSeedsNeeded: number;
}

export function calculatePlantPopulation(input: PlantPopulationInput): PlantPopulationResult | null {
  const { rowSpacingCm, seedsPerMeter, germinationPct, areaHectares } = input;
  if (rowSpacingCm <= 0 || seedsPerMeter <= 0 || germinationPct <= 0 || areaHectares <= 0) return null;

  const rowSpacingMeters = rowSpacingCm / 100;
  const linearMetersPerHectare = 10_000 / rowSpacingMeters;
  const grossSeedsPerHectare = seedsPerMeter * linearMetersPerHectare;
  const finalPopulationPerHectare = grossSeedsPerHectare * (germinationPct / 100);
  const totalSeedsNeeded = grossSeedsPerHectare * areaHectares;

  return { linearMetersPerHectare, grossSeedsPerHectare, finalPopulationPerHectare, totalSeedsNeeded };
}
