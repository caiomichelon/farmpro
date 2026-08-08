import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Farm } from '../types/database';

export interface FarmSummary extends Farm {
  totalHectares: number;
  totalPlots: number;
  lavouraHectares: number;
  pecuariaHectares: number;
}

async function withPlotSummary(farms: Farm[]): Promise<FarmSummary[]> {
  if (farms.length === 0) return [];

  const { data: plots, error } = await supabase
    .from('plots')
    .select('farm_id, area_hectares, type')
    .in(
      'farm_id',
      farms.map((f) => f.id)
    );

  if (error) throw error;

  return farms.map((farm) => {
    const farmPlots = (plots ?? []).filter((p) => p.farm_id === farm.id);
    const lavouraHectares = farmPlots
      .filter((p) => p.type === 'lavoura')
      .reduce((sum, p) => sum + Number(p.area_hectares), 0);
    const pecuariaHectares = farmPlots
      .filter((p) => p.type === 'pecuaria')
      .reduce((sum, p) => sum + Number(p.area_hectares), 0);

    return {
      ...farm,
      totalPlots: farmPlots.length,
      lavouraHectares,
      pecuariaHectares,
      totalHectares: lavouraHectares + pecuariaHectares,
    };
  });
}

export function useFarms() {
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: true });

      if (farmsError) throw farmsError;

      setFarms(await withPlotSummary(data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as fazendas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createFarm = useCallback(
    async (input: { name: string; city?: string; state?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return { error: 'Usuário não autenticado.' };

      const { error: insertError } = await supabase.from('farms').insert({
        name: input.name,
        city: input.city ?? null,
        state: input.state ?? null,
        created_by: userId,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [reload]
  );

  const updateFarmLocation = useCallback(
    async (farmId: string, latitude: number, longitude: number) => {
      const { error: updateError } = await supabase.from('farms').update({ latitude, longitude }).eq('id', farmId);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  const updateFarmGoal = useCallback(
    async (farmId: string, goalName: string | null, goalAmount: number | null) => {
      const { error: updateError } = await supabase
        .from('farms')
        .update({ goal_name: goalName, goal_amount: goalAmount })
        .eq('id', farmId);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  const updateFarmVault = useCallback(
    async (
      farmId: string,
      input: {
        successor_name: string | null;
        successor_relationship: string | null;
        successor_phone: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        vault_notes: string | null;
      }
    ) => {
      const { error: updateError } = await supabase
        .from('farms')
        .update({ ...input, vault_updated_at: new Date().toISOString() })
        .eq('id', farmId);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  return { farms, isLoading, error, reload, createFarm, updateFarmLocation, updateFarmGoal, updateFarmVault };
}

export function useFarm(farmId: string | undefined) {
  const { farms, isLoading, error, reload, updateFarmLocation, updateFarmGoal, updateFarmVault } = useFarms();
  const farm = farms.find((f) => f.id === farmId);
  return { farm, isLoading, error, reload, updateFarmLocation, updateFarmGoal, updateFarmVault };
}
