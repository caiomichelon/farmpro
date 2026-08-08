import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CattleLotPhoto } from '../types/database';

/** Fotos diárias do lote, mais recente primeiro — a base do timelapse. */
export function useCattleLotPhotos(lotId: string | undefined) {
  const [photos, setPhotos] = useState<CattleLotPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cattle_lot_photos')
        .select('*')
        .eq('lot_id', lotId)
        .order('taken_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPhotos(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as fotos.');
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addPhoto = useCallback(
    async (photoUrl: string) => {
      if (!lotId) return { error: 'Lote não encontrado.' };

      const { error: insertError } = await supabase.from('cattle_lot_photos').insert({
        lot_id: lotId,
        photo_url: photoUrl,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [lotId, reload]
  );

  return { photos, isLoading, error, reload, addPhoto };
}
