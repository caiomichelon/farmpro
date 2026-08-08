import { useCallback, useEffect, useState } from 'react';

import { getDocumentAlertStatus } from '../lib/documentAlerts';
import { supabase } from '../lib/supabase';
import { deriveWeatherRisks, fetchWeatherForecast } from '../lib/weather';
import type { AlertPreferenceKey } from '../types/database';
import { useProfile } from './useProfile';

export type AlertSeverity = 'danger' | 'warning';

export interface FarmAlert {
  id: string;
  category: AlertPreferenceKey;
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
  const { isAlertEnabled } = useProfile();
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
          category: 'documentos',
          severity: 'danger',
          title: `${expired.length} ${expired.length === 1 ? 'documento vencido' : 'documentos vencidos'}`,
          description: [...new Set(expired.map((d) => d.employees?.full_name).filter(Boolean))].join(', '),
          href: `/farms/${farmId}/funcionarios`,
        });
      }
      if (expiringSoon.length > 0) {
        result.push({
          id: 'docs-vencendo',
          category: 'documentos',
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
              category: 'mortalidade',
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
                category: 'peso_lote',
                severity: 'warning',
                title: `Lote ${lot.name}: peso caiu na última pesagem`,
                description: `${Number(prev.avg_weight_kg).toFixed(0)} kg → ${Number(last.avg_weight_kg).toFixed(0)} kg`,
                href: `/farms/${farmId}/pecuaria/corte/lote/${lot.id}`,
              });
            }
          }
        }
      }

      // ── Pecuária — vacinas pendentes e partos previstos ─────────────────
      const today = new Date().toISOString().slice(0, 10);
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const in7DaysStr = in7Days.toISOString().slice(0, 10);

      const { data: healthEvents } = await supabase
        .from('cattle_animal_health_events')
        .select('next_due_date, cattle_animals!inner(farm_id)')
        .eq('cattle_animals.farm_id', farmId)
        .not('next_due_date', 'is', null)
        .lte('next_due_date', in7DaysStr);

      const pendingVaccines = (healthEvents ?? []) as unknown as { next_due_date: string }[];
      const overdueVaccines = pendingVaccines.filter((e) => e.next_due_date < today);
      const upcomingVaccines = pendingVaccines.filter((e) => e.next_due_date >= today);

      if (overdueVaccines.length > 0) {
        result.push({
          id: 'vacina-vencida',
          category: 'vacina_pendente',
          severity: 'danger',
          title: `${overdueVaccines.length} ${overdueVaccines.length === 1 ? 'vacina/tratamento vencido' : 'vacinas/tratamentos vencidos'}`,
          description: 'Confira a planilha de vacinas pendentes do Corte.',
          href: `/farms/${farmId}/pecuaria/corte/vacinas-pendentes`,
        });
      } else if (upcomingVaccines.length > 0) {
        result.push({
          id: 'vacina-proxima',
          category: 'vacina_pendente',
          severity: 'warning',
          title: `${upcomingVaccines.length} ${upcomingVaccines.length === 1 ? 'vacina/tratamento vence' : 'vacinas/tratamentos vencem'} nos próximos 7 dias`,
          description: 'Confira a planilha de vacinas pendentes do Corte.',
          href: `/farms/${farmId}/pecuaria/corte/vacinas-pendentes`,
        });
      }

      const { data: inseminations } = await supabase
        .from('inseminations')
        .select('id, expected_calving_date, breeding_cows!inner(farm_id)')
        .eq('breeding_cows.farm_id', farmId)
        .not('expected_calving_date', 'is', null)
        .lte('expected_calving_date', in7DaysStr);

      const dueInseminations = (inseminations ?? []) as unknown as { id: string; expected_calving_date: string }[];
      if (dueInseminations.length > 0) {
        const { data: calvings } = await supabase
          .from('calvings')
          .select('insemination_id')
          .in('insemination_id', dueInseminations.map((i) => i.id));
        const calvedIds = new Set((calvings ?? []).map((c) => c.insemination_id));
        const pendingCalvings = dueInseminations.filter((i) => !calvedIds.has(i.id));
        const overdueCalvings = pendingCalvings.filter((i) => i.expected_calving_date < today);
        const upcomingCalvings = pendingCalvings.filter((i) => i.expected_calving_date >= today);

        if (overdueCalvings.length > 0) {
          result.push({
            id: 'parto-vencido',
            category: 'parto_previsto',
            severity: 'danger',
            title: `${overdueCalvings.length} ${overdueCalvings.length === 1 ? 'parto previsto já passou' : 'partos previstos já passaram'} da data`,
            description: 'Confira a planilha de partos previstos da Cria.',
            href: `/farms/${farmId}/pecuaria/cria/partos-previstos`,
          });
        } else if (upcomingCalvings.length > 0) {
          result.push({
            id: 'parto-proximo',
            category: 'parto_previsto',
            severity: 'warning',
            title: `${upcomingCalvings.length} ${upcomingCalvings.length === 1 ? 'parto previsto' : 'partos previstos'} nos próximos 7 dias`,
            description: 'Confira a planilha de partos previstos da Cria.',
            href: `/farms/${farmId}/pecuaria/cria/partos-previstos`,
          });
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
                category: 'financeiro_safra',
                severity: 'warning',
                title: `Safra ${season.season_label} no prejuízo`,
                description: `${plot?.name ?? 'Talhão'}: custo de ${cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} contra receita de ${revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
                href: `/farms/${farmId}/lavoura/safra/${season.id}`,
              });
            }
          }
        }
      }

      // ── Clima — só quando a fazenda já tem localização definida ────────
      if (isAlertEnabled('clima')) {
        const { data: farmRow } = await supabase.from('farms').select('latitude, longitude').eq('id', farmId).single();
        if (farmRow?.latitude != null && farmRow?.longitude != null) {
          const forecast = await fetchWeatherForecast(Number(farmRow.latitude), Number(farmRow.longitude));
          const risks = deriveWeatherRisks(forecast);
          for (const risk of risks) {
            result.push({
              id: `clima-${risk.type}`,
              category: 'clima',
              severity: risk.severity,
              title: risk.title,
              description: risk.description,
              href: `/farms/${farmId}/clima`,
            });
          }
        }
      }
    } catch {
      // Alertas são um extra informativo — se algo falhar aqui, a tela
      // principal segue funcionando normalmente, só sem os alertas.
    } finally {
      // danger primeiro
      result.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1));
      // Respeita o que foi desligado em Ajustes → Notificações.
      setAlerts(result.filter((alert) => isAlertEnabled(alert.category)));
      setIsLoading(false);
    }
  }, [farmId, isAlertEnabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { alerts, isLoading, reload };
}
