/** Calculadora de calda (mistura de defensivo) — área × dose = quantidade
 * de produto, e quanto colocar em cada tanque cheio. Conta que todo
 * aplicador faz de cabeça ou no papel antes de sair pulverizando. */

export interface SprayMixInput {
  areaHectares: number;
  doseProductPerHa: number;
  sprayVolumePerHaLiters: number;
  tankCapacityLiters: number;
}

export interface SprayMixResult {
  totalProductNeeded: number;
  totalSprayVolumeLiters: number;
  fullTanks: number;
  productPerFullTank: number;
  lastTankVolumeLiters: number;
  productForLastTank: number;
}

export function calculateSprayMix(input: SprayMixInput): SprayMixResult | null {
  const { areaHectares, doseProductPerHa, sprayVolumePerHaLiters, tankCapacityLiters } = input;
  if (areaHectares <= 0 || doseProductPerHa <= 0 || sprayVolumePerHaLiters <= 0 || tankCapacityLiters <= 0) {
    return null;
  }

  const totalProductNeeded = areaHectares * doseProductPerHa;
  const totalSprayVolumeLiters = areaHectares * sprayVolumePerHaLiters;
  const fullTanks = Math.floor(totalSprayVolumeLiters / tankCapacityLiters);
  const lastTankVolumeLiters = totalSprayVolumeLiters - fullTanks * tankCapacityLiters;
  // Produto por litro de calda, multiplicado pela capacidade do tanque —
  // assim cada tanque cheio (ou o resto do último) já sai com a proporção
  // certa de produto.
  const productPerLiterOfSpray = doseProductPerHa / sprayVolumePerHaLiters;
  const productPerFullTank = productPerLiterOfSpray * tankCapacityLiters;
  const productForLastTank = productPerLiterOfSpray * lastTankVolumeLiters;

  return {
    totalProductNeeded,
    totalSprayVolumeLiters,
    fullTanks,
    productPerFullTank,
    lastTankVolumeLiters,
    productForLastTank,
  };
}
