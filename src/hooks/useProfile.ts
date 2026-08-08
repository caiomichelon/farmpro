import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { AlertPreferenceKey, AlertPreferences, Profile } from '../types/database';

/** Perfil do usuário logado — nome, e-mail e preferências de alerta,
 * usados nas telas de Ajustes (Conta e Notificações). */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data, error: fetchError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (fetchError) throw fetchError;
      setProfile(data as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o perfil.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateFullName = useCallback(
    async (fullName: string) => {
      if (!profile) return { error: 'Perfil não carregado.' };
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile.id);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [profile, reload]
  );

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    return { error: updateError?.message ?? null };
  }, []);

  const updateAlertPreferences = useCallback(
    async (preferences: AlertPreferences) => {
      if (!profile) return { error: 'Perfil não carregado.' };
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ alert_preferences: preferences })
        .eq('id', profile.id);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [profile, reload]
  );

  const isAlertEnabled = useCallback(
    (key: AlertPreferenceKey): boolean => {
      // Sem preferência salva ainda = tudo ligado por padrão (não esconde
      // alerta relevante de quem nunca abriu Ajustes → Notificações).
      return profile?.alert_preferences?.[key] !== false;
    },
    [profile]
  );

  return { profile, isLoading, error, reload, updateFullName, updatePassword, updateAlertPreferences, isAlertEnabled };
}
