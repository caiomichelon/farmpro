import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleActivityGroup } from '../types/database';

/** Setores leves de gado (pasto, suplementação proteica etc.) — grupos de
 * animais fora do Corte/semi-confinamento, sem lista fixa de nomes: quem
 * usa cria o setor na hora, só digitando o nome. */
export function useCattleActivityGroups(farmId: string | undefined) {
  const [groups, setGroups] = useState<CattleActivityGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_activity_groups')
        .select('*')
        .eq('farm_id', farmId)
        .order('sector_name', { ascending: true });

      if (fetchError) throw fetchError;
      setGroups(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os setores.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createGroup = useCallback(
    async (input: { sector_name: string; head_count: number; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      if (!input.sector_name.trim()) return { error: 'Informe o nome do setor.' };

      const { error: insertError } = await supabase.from('cattle_activity_groups').insert({
        farm_id: farmId,
        sector_name: input.sector_name.trim(),
        head_count: input.head_count,
        notes: input.notes?.trim() || null,
      });

      if (insertError) return { error: insertError.message };
      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  const updateGroup = useCallback(
    async (id: string, input: { sector_name?: string; head_count?: number; notes?: string | null }) => {
      const { error: updateError } = await supabase
        .from('cattle_activity_groups')
        .update({
          ...(input.sector_name !== undefined ? { sector_name: input.sector_name.trim() } : {}),
          ...(input.head_count !== undefined ? { head_count: input.head_count } : {}),
          ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('cattle_activity_groups').delete().eq('id', id);
      if (deleteError) return { error: deleteError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  /** Move `headCount` cabeças de um setor pra outro — tira do setor de
   * origem (apaga se zerar) e soma no setor de destino (cria se ainda não
   * existir), num fluxo só, pra bater com o jeito real de "vou transferir
   * animais do pasto pro semi" sem precisar editar os dois setores na mão. */
  const transfer = useCallback(
    async (input: { fromGroupId: string; toSectorName: string; headCount: number }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      const fromGroup = groups.find((g) => g.id === input.fromGroupId);
      if (!fromGroup) return { error: 'Setor de origem não encontrado.' };
      if (input.headCount <= 0 || input.headCount > fromGroup.head_count) {
        return { error: `Informe de 1 a ${fromGroup.head_count} cabeças.` };
      }

      const remaining = fromGroup.head_count - input.headCount;
      if (remaining > 0) {
        const { error: updateError } = await supabase
          .from('cattle_activity_groups')
          .update({ head_count: remaining, updated_at: new Date().toISOString() })
          .eq('id', fromGroup.id);
        if (updateError) return { error: updateError.message };
      } else {
        const { error: deleteError } = await supabase.from('cattle_activity_groups').delete().eq('id', fromGroup.id);
        if (deleteError) return { error: deleteError.message };
      }

      const toSectorName = input.toSectorName.trim();
      const existingDestination = groups.find(
        (g) => g.id !== fromGroup.id && g.sector_name.toLowerCase() === toSectorName.toLowerCase()
      );

      if (existingDestination) {
        const { error: updateError } = await supabase
          .from('cattle_activity_groups')
          .update({ head_count: existingDestination.head_count + input.headCount, updated_at: new Date().toISOString() })
          .eq('id', existingDestination.id);
        if (updateError) return { error: updateError.message };
      } else {
        const { error: insertError } = await supabase.from('cattle_activity_groups').insert({
          farm_id: farmId,
          sector_name: toSectorName,
          head_count: input.headCount,
        });
        if (insertError) return { error: insertError.message };
      }

      await reload();
      return { error: null };
    },
    [farmId, groups, reload]
  );

  return { groups, isLoading, error, reload, createGroup, updateGroup, deleteGroup, transfer };
}
