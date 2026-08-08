/** Calculadora de preço mínimo (break-even) — reutilizável nos três
 * setores: quanto precisa vender (por @, por saca, por bezerro) só pra
 * cobrir o custo, e quanto precisa vender pra bater uma margem alvo. */

export interface BreakEvenInput {
  totalCost: number;
  quantity: number;
  targetMarginPct: number;
}

export interface BreakEvenResult {
  breakEvenPrice: number;
  targetPrice: number;
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult | null {
  const { totalCost, quantity, targetMarginPct } = input;
  if (totalCost <= 0 || quantity <= 0) return null;

  const breakEvenPrice = totalCost / quantity;
  const targetPrice = breakEvenPrice * (1 + targetMarginPct / 100);

  return { breakEvenPrice, targetPrice };
}
