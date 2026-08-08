import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { EmployeeTask } from '../types/database';

export interface EmployeeTaskSummary extends EmployeeTask {
  employeeName: string | null;
}

/** Lista de tarefas do dia da fazenda (todas, ou só de um funcionário se
 * `employeeId` for passado) — o gerente cria/atribui, quem for fazer risca
 * quando termina. Complementa o ponto digital. */
export function useEmployeeTasks(farmId: string | undefined, employeeId?: string) {
  const [tasks, setTasks] = useState<EmployeeTaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('employee_tasks')
        .select('*, employees(full_name)')
        .eq('farm_id', farmId);
      if (employeeId) query = query.eq('employee_id', employeeId);

      const { data, error: fetchError } = await query.order('due_date', { ascending: true }).order('created_at', { ascending: true });
      if (fetchError) throw fetchError;

      const rows = (data ?? []) as unknown as (EmployeeTask & { employees: { full_name: string } | null })[];
      setTasks(rows.map((r) => ({ ...r, employeeName: r.employees?.full_name ?? null })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as tarefas.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId, employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createTask = useCallback(
    async (input: { title: string; employee_id?: string; due_date?: string; notes?: string }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };
      if (!input.title.trim()) return { error: 'Escreva o que precisa ser feito.' };

      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('employee_tasks').insert({
        farm_id: farmId,
        employee_id: input.employee_id || null,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        due_date: input.due_date || new Date().toISOString().slice(0, 10),
        created_by: userData.user?.id ?? null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  const toggleDone = useCallback(
    async (taskId: string, done: boolean) => {
      const { error: updateError } = await supabase
        .from('employee_tasks')
        .update({ done_at: done ? new Date().toISOString() : null })
        .eq('id', taskId);
      if (updateError) return { error: updateError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const { error: deleteError } = await supabase.from('employee_tasks').delete().eq('id', taskId);
      if (deleteError) return { error: deleteError.message };
      await reload();
      return { error: null };
    },
    [reload]
  );

  return { tasks, isLoading, error, reload, createTask, toggleDone, deleteTask };
}
