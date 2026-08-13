/** Status de validade de um item de estoque — compartilhado entre o
 * estoque da Pecuária e o da Lavoura, e usado tanto nos cards quanto nos
 * alertas da fazenda. Sem data de validade, não há o que avaliar. */
export type ExpirationStatus = 'vencido' | 'vencendo' | 'ok' | null;

/** Itens que vencem dentro desse número de dias entram em alerta amarelo
 * (30 dias — tempo o bastante pra planejar reposição ou uso antes de
 * perder o produto, comum em apps de estoque profissionais). */
const EXPIRING_SOON_DAYS = 30;

export function computeExpirationStatus(expirationDate: string | null, today: Date = new Date()): ExpirationStatus {
  if (!expirationDate) return null;
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiry = new Date(`${expirationDate}T00:00:00`);
  const diffDays = Math.round((expiry.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'vencido';
  if (diffDays <= EXPIRING_SOON_DAYS) return 'vencendo';
  return 'ok';
}

export const EXPIRATION_STATUS_LABELS: Record<Exclude<ExpirationStatus, null>, string> = {
  vencido: 'Vencido',
  vencendo: 'Vence em breve',
  ok: 'Validade ok',
};
