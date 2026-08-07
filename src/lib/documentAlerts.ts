export type DocumentAlertStatus = 'vencido' | 'vence_em_breve' | 'ok' | 'sem_validade';

const WARNING_WINDOW_DAYS = 30;

/** Status do alerta de documentação a partir da data de validade. */
export function getDocumentAlertStatus(expiryDate: string | null): DocumentAlertStatus {
  if (!expiryDate) return 'sem_validade';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const daysUntilExpiry = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilExpiry < 0) return 'vencido';
  if (daysUntilExpiry <= WARNING_WINDOW_DAYS) return 'vence_em_breve';
  return 'ok';
}

export const DOCUMENT_ALERT_LABELS: Record<DocumentAlertStatus, string> = {
  vencido: 'Vencido',
  vence_em_breve: 'Vence em breve',
  ok: 'Em dia',
  sem_validade: 'Sem validade',
};
