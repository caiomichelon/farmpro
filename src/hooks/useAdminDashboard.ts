import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

export interface AdminDayCount {
  day: string;
  count: number;
}

export interface AdminRecentFarm {
  name: string;
  city: string | null;
  state: string | null;
  created_at: string;
}

export interface AdminDashboardStats {
  totalFarms: number;
  totalUsers: number;
  signupsLast7d: number;
  signupsLast30d: number;
  activeLast7d: number;
  activeLast30d: number;
  farmsByDay: AdminDayCount[];
  usersByDay: AdminDayCount[];
  recentFarms: AdminRecentFarm[];
}

/** Estatísticas reais de uso do FarmPro (fazendas, usuários, cadastros e
 * atividade recente) — só carrega pra quem está na lista de administrador
 * no banco; qualquer outra conta recebe erro de autorização da própria
 * função (`admin_dashboard_stats`, SECURITY DEFINER). */
export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_dashboard_stats');
      if (rpcError) throw rpcError;
      setStats(data as AdminDashboardStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o painel.');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stats, isLoading, error, reload };
}
