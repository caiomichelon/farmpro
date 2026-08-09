import { useCallback } from 'react';

import { supabase } from '../lib/supabase';

function defaultSeasonLabel() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}

/** Atalho pra quem só quer lançar colheita e não tem nenhum talhão
 * cadastrado ainda — cria um talhão e uma safra num só passo, sem pedir
 * pra pessoa entender "talhão"/"safra" separadamente. O nome do talhão é
 * gerado automaticamente; se quiser organizar por área depois, dá pra
 * renomear e cadastrar outros talhões normalmente. */
export function useQuickHarvestStart(farmId: string | undefined) {
  const start = useCallback(
    async (input: { crop: string; area_hectares: number }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.', seasonId: null };

      const { data: plot, error: plotError } = await supabase
        .from('plots')
        .insert({
          farm_id: farmId,
          name: 'Talhão 1',
          area_hectares: input.area_hectares,
          type: 'lavoura',
        })
        .select('id')
        .single();

      if (plotError) return { error: plotError.message, seasonId: null };

      const { data: season, error: seasonError } = await supabase
        .from('plot_seasons')
        .insert({
          plot_id: plot.id,
          season_label: defaultSeasonLabel(),
          crop: input.crop,
          planted_area_hectares: input.area_hectares,
          status: 'colhendo',
        })
        .select('id')
        .single();

      if (seasonError) return { error: seasonError.message, seasonId: null };

      return { error: null, seasonId: season.id as string };
    },
    [farmId]
  );

  return { start };
}
