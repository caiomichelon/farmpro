import { useCallback, useEffect, useState } from 'react';

import { getDocumentAlertStatus, type DocumentAlertStatus } from '../lib/documentAlerts';
import { supabase } from '../lib/supabase';
import type { Equipment, EquipmentMaintenance } from '../types/database';

export interface EquipmentSummary extends Equipment {
  lastMaintenance: EquipmentMaintenance | null;
  nextDueStatus: DocumentAlertStatus;
}

async function withSummary(items: Equipment[]): Promise<EquipmentSummary[]> {
  if (items.length === 0) return [];
  const ids = items.map((e) => e.id);

  const { data: maintenances, error } = await supabase
    .from('equipment_maintenance')
    .select('*')
    .in('equipment_id', ids)
    .order('performed_at', { ascending: false });
  if (error) throw error;

  return items.map((item) => {
    const itemMaintenances = (maintenances ?? []).filter((m) => m.equipment_id === item.id);
    const lastMaintenance = itemMaintenances[0] ?? null;
    return {
      ...item,
      lastMaintenance,
      nextDueStatus: getDocumentAlertStatus(lastMaintenance?.next_due_date ?? null),
    };
  });
}

/** Maquinário/equipamentos da fazenda — tratores, implementos — com a
 * última manutenção e status da próxima (reaproveita a mesma heurística de
 * "vencido/vence em breve" dos documentos de funcionário). */
export function useEquipment(farmId: string | undefined) {
  const [equipment, setEquipment] = useState<EquipmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('equipment')
        .select('*')
        .eq('farm_id', farmId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setEquipment(await withSummary(data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o maquinário.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEquipment = useCallback(
    async (input: { name: string; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      if (!input.name.trim()) return { error: 'Informe o nome do equipamento.' };

      const { error: insertError } = await supabase.from('equipment').insert({
        farm_id: farmId,
        name: input.name.trim(),
        notes: input.notes?.trim() || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  return { equipment, isLoading, error, reload, createEquipment };
}

/** Histórico de manutenções de um equipamento — mais recente primeiro. */
export function useEquipmentMaintenance(equipmentId: string | undefined) {
  const [maintenances, setMaintenances] = useState<EquipmentMaintenance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!equipmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('equipment_maintenance')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('performed_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMaintenances(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as manutenções.');
    } finally {
      setIsLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createMaintenance = useCallback(
    async (input: { maintenance_type: string; performed_at?: string; next_due_date?: string; cost?: number; notes?: string }) => {
      if (!equipmentId) return { error: 'Equipamento não encontrado.' };
      if (!input.maintenance_type.trim()) return { error: 'Descreva o tipo de manutenção.' };

      const { error: insertError } = await supabase.from('equipment_maintenance').insert({
        equipment_id: equipmentId,
        maintenance_type: input.maintenance_type.trim(),
        performed_at: input.performed_at || new Date().toISOString().slice(0, 10),
        next_due_date: input.next_due_date || null,
        cost: input.cost ?? null,
        notes: input.notes?.trim() || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [equipmentId, reload]
  );

  return { maintenances, isLoading, error, reload, createMaintenance };
}
