/** Padrão de mercado no Brasil pra soja, milho, café e trigo — usado como
 * valor inicial no formulário, sempre editável (varia por cultura/região,
 * então nunca é travado). */
export const DEFAULT_KG_PER_SACA = 60;

/** Sacas a partir do peso líquido (kg) de uma carga — arredonda pra 1 casa
 * decimal, que é precisão suficiente pra controle de colheita. */
export function calcSacasFromWeight(netWeightKg: number, kgPerSaca: number): number | null {
  if (netWeightKg <= 0 || kgPerSaca <= 0) return null;
  return Math.round((netWeightKg / kgPerSaca) * 10) / 10;
}
