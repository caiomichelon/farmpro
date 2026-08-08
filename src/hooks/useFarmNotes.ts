import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { FarmNote } from '../types/database';

/** Diário de bordo da fazenda — notas rápidas (texto/foto/GPS), mais
 * recentes primeiro. Pensado pra lançar em 1 toque, sem escolher
 * lote/talhão/animal antes. */
export function useFarmNotes(farmId: string | undefined) {
  const [notes, setNotes] = useState<FarmNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('farm_notes')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setNotes(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o diário de bordo.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createNote = useCallback(
    async (input: { note_text?: string; photo_url?: string; latitude?: number; longitude?: number }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      if (!input.note_text?.trim() && !input.photo_url) {
        return { error: 'Escreva algo ou anexe uma foto.' };
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('farm_notes').insert({
        farm_id: farmId,
        note_text: input.note_text?.trim() || null,
        photo_url: input.photo_url || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        created_by: userData.user?.id ?? null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const { error: deleteError } = await supabase.from('farm_notes').delete().eq('id', noteId);
      if (deleteError) return { error: deleteError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  return { notes, isLoading, error, reload, createNote, deleteNote };
}
