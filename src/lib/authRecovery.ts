import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** URL de retorno usada no e-mail de redefinição de senha — aponta pra tela
 * `/auth/redefinir-senha`, seja no app nativo (`farmpro://...`) ou na versão
 * web publicada (respeitando o subcaminho `/farmpro` do GitHub Pages, quando
 * for o caso). */
export function buildResetPasswordRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // `Linking.createURL` no web resolve o path contra `window.location.origin`
    // sozinho, perdendo um subcaminho tipo "/farmpro" (GitHub Pages) — por
    // isso calculamos manualmente a partir da própria URL atual, cortando a
    // partir de "/auth/" (funciona tanto em produção, "/farmpro/auth/...",
    // quanto em desenvolvimento local, sem subcaminho nenhum).
    const base = window.location.pathname.split('/auth/')[0] ?? '';
    return `${window.location.origin}${base}/auth/redefinir-senha`;
  }
  return Linking.createURL('/auth/redefinir-senha');
}

/** Extrai os parâmetros de autenticação (access_token, refresh_token, error,
 * etc.) de uma URL de redefinição de senha do Supabase — eles vêm tanto na
 * query string quanto (mais comum, no fluxo padrão) no fragmento (#) no
 * final da URL. */
export function parseAuthParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const collect = (part: string) => {
    new URLSearchParams(part).forEach((value, key) => {
      params[key] = value;
    });
  };
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  if (queryIndex >= 0) collect(url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined));
  if (hashIndex >= 0) collect(url.slice(hashIndex + 1));
  return params;
}
