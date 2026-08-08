import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { FarmInvite, FarmRole } from '../types/database';

export interface FarmMemberWithProfile {
  user_id: string;
  role: FarmRole;
  created_at: string;
  fullName: string | null;
  email: string | null;
}

function generateInviteCode(): string {
  // Sem caracteres ambíguos (0/O, 1/I/l) — é pra ser digitado por outra
  // pessoa, olhando a tela do seu celular.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** Membros de uma fazenda (com nome/e-mail) + convites por código ativos. */
export function useFarmMembers(farmId: string | undefined) {
  const [members, setMembers] = useState<FarmMemberWithProfile[]>([]);
  const [invites, setInvites] = useState<FarmInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [{ data: memberRows, error: membersError }, { data: inviteRows, error: invitesError }] = await Promise.all([
        supabase.from('farm_members').select('user_id, role, created_at, profiles(full_name, email)').eq('farm_id', farmId),
        supabase
          .from('farm_invites')
          .select('*')
          .eq('farm_id', farmId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ]);

      if (membersError) throw membersError;
      if (invitesError) throw invitesError;

      const rows = (memberRows ?? []) as unknown as {
        user_id: string;
        role: FarmRole;
        created_at: string;
        profiles: { full_name: string | null; email: string | null } | null;
      }[];
      setMembers(
        rows.map((row) => ({
          user_id: row.user_id,
          role: row.role,
          created_at: row.created_at,
          fullName: row.profiles?.full_name ?? null,
          email: row.profiles?.email ?? null,
        }))
      );
      setInvites((inviteRows ?? []) as FarmInvite[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os membros.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createInvite = useCallback(
    async (role: FarmRole) => {
      if (!farmId) return { error: 'Fazenda não encontrada.', code: null };
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return { error: 'Usuário não autenticado.', code: null };

      // Tenta algumas vezes pra evitar colisão de código (raríssimo, mas o
      // código é curto de propósito pra ser fácil de digitar).
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateInviteCode();
        const { error: insertError } = await supabase.from('farm_invites').insert({
          farm_id: farmId,
          code,
          role,
          created_by: userId,
        });
        if (!insertError) {
          await reload();
          return { error: null, code };
        }
        if (!insertError.message.includes('duplicate')) {
          return { error: insertError.message, code: null };
        }
      }
      return { error: 'Não foi possível gerar um código único. Tente de novo.', code: null };
    },
    [farmId, reload]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      const { error: deleteError } = await supabase
        .from('farm_members')
        .delete()
        .eq('farm_id', farmId)
        .eq('user_id', userId);
      if (deleteError) return { error: deleteError.message };
      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  return { members, invites, isLoading, error, reload, createInvite, removeMember };
}

/** Entrar numa fazenda existente usando um código de convite. */
export async function joinFarmByCode(code: string): Promise<{ error: string | null; farmId: string | null }> {
  const { data, error } = await supabase.rpc('join_farm_by_code', { invite_code: code.trim() });
  if (error) return { error: error.message, farmId: null };
  const row = data?.[0];
  if (!row) return { error: 'Código de convite inválido.', farmId: null };
  return { error: null, farmId: row.result_farm_id };
}
