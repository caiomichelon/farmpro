import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null; hasSession: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string, redirectTo: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // getSession() pode ficar pendurado pra sempre se o backend do Supabase
    // não responder (por exemplo, projeto do plano gratuito pausado por
    // inatividade) — sem timeout, isLoading nunca vira false e a tela de
    // capa (app/index.tsx) fica travada esperando pra sempre, sem cair nem
    // pro login nem pro app. Uma corrida com um timeout garante que a gente
    // sempre sai desse estado, mesmo que sem sessão restaurada dessa vez.
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn('[auth] getSession demorou demais pra responder — seguindo sem sessão restaurada.');
      setIsLoading(false);
    }, 8000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        setSession(data.session);
        setIsLoading(false);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        console.warn('[auth] Falha ao restaurar sessão:', error);
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        // Se a confirmação de e-mail estiver desligada no projeto Supabase,
        // o signUp já vem com sessão ativa — não faz sentido pedir pra
        // confirmar o que já está confirmado.
        return { error: error?.message ?? null, hasSession: Boolean(data.session) };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async sendPasswordResetEmail(email, redirectTo) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return { error: error?.message ?? null };
      },
    }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
