import { useCallback, useEffect, useState } from 'react';

import { getDocumentAlertStatus } from '../lib/documentAlerts';
import { supabase } from '../lib/supabase';

export type AlertSeverity = 'danger' | 'warning';

export interface FarmAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  href: string;
}

/**
 * Alertas automáticos da fazenda — o app olha os dados e avisa o que foge
 * do padrão, em vez de você precisar caçar isso navegando tela por tela:
 * documentos vencidos, mortalidade de lote acima da média da fazenda, peso
 * caindo entre pesagens, e safra dando prejuízo.
 */
export function useFarmAlerts(farmId: string | undefined) {
  const [alerts, setAlerts] = useState<FarmAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    const result: FarmAlert[] = [];

    try {
      // ── Documentos de funcionários ──────────────────────────────────────
      const { data: docs } = await supabase
        .from('employee_documents')
        .select('expiry_date, employees!inner(farm_id, full_name)')
        .eq('employees.farm_id', farmId);

      const expired = ((docs ?? []) as unknown as { expiry_date: string | null; employees: { full_name: string } | null }[]).filter(
        (d) => getDocumentAlertStatus(d.expiry_date) === 'vencido'
      );
      const expiringSoon = ((docs ?? []) as unknown as { expiry_date: string | null; employees: { full_name: string } | null }[]).filter(
        (d) => getDocumentAlertStatus(d.expiry_date) === 'vence_em_breve'
      );

      if (expired.length > 0) {
        result.push({
          id: 'docs-vencidos',
          severity: 'danger',
          title: `${expired.length} ${expired.length === 1 ? 'documento vencido' : 'documentos vencidos'}`,
          description: [...new Set(expired.map((d) => d.employees?.full_name).filter(Boolean))].join(', '),
          href: `/farms/${farmId}/funcionarios`,
        });
      }
      if (expiringSoon.length > 0) {
        result.push({
          id: 'docs-vencendo',
          severity: 'warning',
          title: `${expiringSoon.length} ${expiringSoon.length === 1 ? 'documento vence' : 'documentos vencem'} em breve`,
          description: [...new Set(expiringSoon.map((d) => d.employees?.full_name).filter(Boolean))].join(', '),
          href: `/farms/${farmId}/funcionarios`,
        });
      }

      // ── Pecuária — mortalidade e peso ────────────────────────────────────
      const { data: lots } = await supabase
        .from('cattle_lots')
        .select('id, name, entry_head_count, status')
        .eq('farm_id', farmId)
        .eq('status', 'ativo');

      if (lots && lots.length > 0) {
        const lotIds = lots.map((l) => l.id);
        const [{ data: mortalityEvents }, { data: weighings }] = await Promise.all([
          supabase.from('cattle_mortality_events').select('lot_id, head_count').in('lot_id', lotIds),
          supabase
            .from('cattle_lot_weighings')
            .select('lot_id, avg_weight_kg, weighed_at')
            .in('lot_id', lotIds)
            .order('weighed_at', { ascending: true }),
        ]);

        const mortalityByLot = new Map<string, number>();
        for (const lot of lots) {
          const deaths = (mortalityEvents ?? [])
            .filter((m) => m.lot_id === lot.id)
            .reduce((sum, m) => sum + m.head_count, 0);
          mortalityByLot.set(lot.id, lot.entry_head_count > 0 ? (deaths / lot.entry_head_count) * 100 : 0);
        }
        const farmAvgMortality =
          [...mortalityByLot.values()].reduce((sum, v) => sum + v, 0) / Math.max(1, mortalityByLot.size);

        for (const lot of lots) {
          const rate = mortalityByLot.get(lot.id) ?? 0;
          if (rate > 0 && rate > farmAvgMortality * 1.5) {
            result.push({
              id: `mortalidade-${lot.id}`,
              severity: 'danger',
              title: `Lote ${lot.name}: mortalidade acima da média`,
              description: `${rate.toFixed(1)}% neste lote, contra ${farmAvgMortality.toFixed(1)}% da média da fazenda.`,
              href: `/farms/${farmId}/pecuaria/corte/lote/${lot.id}`,
            });
          }

          const lotWeighings = (weighings ?? []).filter((w) => w.lot_id === lot.id);
          if (lotWeighings.length >= 2) {
            const last = lotWeighings[lotWeighings.length - 1];
            const prev = lotWeighings[lotWeighings.length - 2];
            if (Number(last.avg_weight_kg) < Number(prev.avg_weight_kg)) {
              result.push({
                id: `peso-${lot.id}`,
                severity: 'warning',
                title: `Lote ${lot.name}: peso caiu na última pesagem`,
                description: `${Number(prev.avg_weight_kg).toFixed(0)} kg → ${Number(last.avg_weight_kg).toFixed(0)} kg`,
                href: `/farms/${farmId}/pecuaria/corte/lote/${lot.id}`,
              });
            }
          }
        }
      }

      // ── Lavoura — safra com prejuízo ────────────────────────────────────
      const { data: plots } = await supabase.from('plots').select('id, name').eq('farm_id', farmId).eq('type', 'lavoura');
      if (plots && plots.length > 0) {
        const plotIds = plots.map((p) => p.id);
        const { data: seasons } = await supabase
          .from('plot_seasons')
          .select('id, plot_id, season_label')
          .in('plot_id', plotIds);

        if (seasons && seasons.length > 0) {
          const seasonIds = seasons.map((s) => s.id);
          const [{ data: costs }, { data: sales }] = await Promise.all([
            supabase.from('production_costs').select('plot_season_id, total_cost').in('plot_season_id', seasonIds),
            supabase.from('grain_sales').select('plot_season_id, quantity_sacas, price_per_saca').in('plot_season_id', seasonIds),
          ]);

          for (const season of seasons) {
            const cost = (costs ?? [])
              .filter((c) => c.plot_season_id === season.id)
              .reduce((sum, c) => sum + Number(c.total_cost), 0);
            const revenue = (sales ?? [])
              .filter((s) => s.plot_season_id === season.id)
              .reduce((sum, s) => sum + Number(s.quantity_sacas) * Number(s.price_per_saca), 0);

            if (revenue > 0 && cost > revenue) {
              const plot = plots.find((p) => p.id === season.plot_id);
              result.push({
                id: `prejuizo-${season.id}`,
                severity: 'warning',
                title: `Safra ${season.season_label} no prejuízo`,
                description: `${plot?.name ?? 'Talhão'}: custo de ${cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} contra receita de ${revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
                href: `/farms/${farmId}/lavoura/safra/${season.id}`,
              });
            }
          }
        }
      }
    } catch {
      // Alertas são um extra informativo — se algo falhar aqui, a tela
      // principal segue funcionando normalmente, só sem os alertas.
    } finally {
      // danger primeiro
      result.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1));
      setAlerts(result);
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { alerts, isLoading, reload };
}
