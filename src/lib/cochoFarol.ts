export type CochoStatus = 'sem_registro' | 'em_dia' | 'proximo' | 'atrasado';

export interface CochoFarol {
  status: CochoStatus;
  /** Dias desde o último abastecimento — null se nunca foi abastecido. */
  daysSince: number | null;
  /** Dias até precisar abastecer de novo — negativo se já passou do prazo,
   * null se nunca foi abastecido. */
  daysUntilDue: number | null;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / msPerDay);
}

/** Calcula o farol do cocho de um piquete — último abastecimento (data,
 * AAAA-MM-DD) comparado com o intervalo esperado daquele piquete.
 *
 * Regras (mesma lógica que o usuário descreveu): se o intervalo é de N dias
 * e já passou de N dias sem abastecer, fica "atrasado" (vermelho). No último
 * dia do prazo (1 dia ou menos faltando), fica "proximo" (amarelo) — um
 * aviso antes de atrasar de verdade. Fora isso, "em_dia" (verde). Nunca
 * abastecido ainda = "sem_registro" (cinza), não dá pra saber a situação. */
export function computeCochoFarol(lastRefilledAt: string | null, intervalDays: number, today: Date = new Date()): CochoFarol {
  if (!lastRefilledAt) {
    return { status: 'sem_registro', daysSince: null, daysUntilDue: null };
  }

  const daysSince = daysBetween(new Date(lastRefilledAt), today);
  const daysUntilDue = intervalDays - daysSince;

  let status: CochoStatus;
  if (daysUntilDue < 0) {
    status = 'atrasado';
  } else if (daysUntilDue <= 1) {
    status = 'proximo';
  } else {
    status = 'em_dia';
  }

  return { status, daysSince, daysUntilDue };
}
