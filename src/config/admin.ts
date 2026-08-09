/** E-mails com acesso ao painel administrativo — precisa bater com a
 * lista dentro da função `admin_dashboard_stats` no banco (a checagem
 * de verdade é lá; essa lista aqui só evita mostrar o link do painel
 * pra quem não vai conseguir usar). */
export const ADMIN_EMAILS = ['caiomichelon29@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
