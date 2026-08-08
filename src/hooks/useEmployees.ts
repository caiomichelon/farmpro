import { useCallback, useEffect, useState } from 'react';

import { getDocumentAlertStatus } from '../lib/documentAlerts';
import { buildEmployeeGamification } from '../lib/employeeGamification';
import { supabase } from '../lib/supabase';
import type { Employee, EmployeeCostType, EmployeeSector } from '../types/database';

export interface EmployeeSummary extends Employee {
  expiredDocumentCount: number;
  expiringSoonDocumentCount: number;
  unreadMessageCount: number;
  /** Sequência atual de dias com ponto batido — gamificação leve, calculada
   * a partir do mesmo histórico usado na tela de ponto do funcionário. */
  currentStreakDays: number;
}

async function withDocumentAlerts(employees: Employee[]): Promise<EmployeeSummary[]> {
  if (employees.length === 0) return [];

  const employeeIds = employees.map((e) => e.id);

  const [
    { data: documents, error: docsError },
    { data: unreadMessages, error: messagesError },
    { data: timeEntries, error: timeEntriesError },
  ] = await Promise.all([
    supabase.from('employee_documents').select('employee_id, expiry_date').in('employee_id', employeeIds),
    supabase
      .from('employee_messages')
      .select('employee_id')
      .in('employee_id', employeeIds)
      .eq('sender', 'funcionario')
      .is('read_at', null),
    supabase.from('time_entries').select('employee_id, recorded_at').in('employee_id', employeeIds),
  ]);

  if (docsError) throw docsError;
  if (messagesError) throw messagesError;
  if (timeEntriesError) throw timeEntriesError;

  return employees.map((employee) => {
    const employeeDocs = (documents ?? []).filter((d) => d.employee_id === employee.id);
    const statuses = employeeDocs.map((d) => getDocumentAlertStatus(d.expiry_date));
    const employeeEntries = (timeEntries ?? []).filter((t) => t.employee_id === employee.id);

    return {
      ...employee,
      expiredDocumentCount: statuses.filter((s) => s === 'vencido').length,
      expiringSoonDocumentCount: statuses.filter((s) => s === 'vence_em_breve').length,
      unreadMessageCount: (unreadMessages ?? []).filter((m) => m.employee_id === employee.id).length,
      currentStreakDays: buildEmployeeGamification(employeeEntries).currentStreakDays,
    };
  });
}

/** Funcionários de uma fazenda, opcionalmente filtrados por setor. */
export function useEmployees(farmId: string | undefined, sector?: EmployeeSector) {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase.from('employees').select('*').eq('farm_id', farmId);
      if (sector) query = query.eq('sector', sector);

      const { data, error: fetchError } = await query.order('full_name', { ascending: true });
      if (fetchError) throw fetchError;
      setEmployees(await withDocumentAlerts(data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os funcionários.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId, sector]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createEmployee = useCallback(
    async (input: {
      full_name: string;
      sector: EmployeeSector;
      role: string;
      cost_type: EmployeeCostType;
      cost_value: number;
      cpf?: string;
      phone?: string;
      admission_date?: string;
      birth_date?: string;
      address?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
      notes?: string;
    }) => {
      if (!farmId) return { error: 'Fazenda não encontrada.' };

      const { error: insertError } = await supabase.from('employees').insert({
        farm_id: farmId,
        full_name: input.full_name,
        sector: input.sector,
        role: input.role,
        cost_type: input.cost_type,
        cost_value: input.cost_value,
        cpf: input.cpf || null,
        phone: input.phone || null,
        admission_date: input.admission_date || new Date().toISOString().slice(0, 10),
        birth_date: input.birth_date || null,
        address: input.address || null,
        emergency_contact_name: input.emergency_contact_name || null,
        emergency_contact_phone: input.emergency_contact_phone || null,
        notes: input.notes || null,
      });

      if (insertError) return { error: insertError.message };

      await reload();
      return { error: null };
    },
    [farmId, reload]
  );

  return { employees, isLoading, error, reload, createEmployee };
}

export function useEmployee(employeeId: string | undefined) {
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (fetchError) throw fetchError;
      const [summary] = await withDocumentAlerts([data]);
      setEmployee(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o funcionário.');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { employee, isLoading, error, reload };
}
