-- Comparativo regional anônimo — benchmarking opt-in entre fazendas.
--
-- Cada fazenda decide se participa (benchmark_opt_in). As funções abaixo
-- rodam com SECURITY DEFINER pra poder enxergar dados de OUTRAS fazendas
-- (que a RLS normalmente bloquearia), mas só devolvem uma MÉDIA regional
-- (calculada fazenda por fazenda, depois a média das médias) + a contagem
-- de participantes — nunca uma linha por fazenda. Com menos de 3 fazendas
-- na amostra, a média sai null: com só 1 ou 2 outras fazendas, a "média"
-- praticamente revela o valor de alguém, o que quebra o anonimato prometido.
--
-- O valor "da minha fazenda" pra comparar não vem daqui — o app já calcula
-- isso no cliente com os mesmos dados que ele carrega normalmente (mesma
-- fórmula usada no benchmarking interno de lotes/matrizes/safras).

alter table public.farms add column if not exists benchmark_opt_in boolean not null default false;

-- Corte: GMD médio (kg/dia) e custo por arroba dos lotes ativos.
create or replace function public.regional_benchmark_corte(p_farm_id uuid)
returns table (
  regional_avg_gmd_kg_day numeric,
  regional_avg_cost_per_arroba numeric,
  participant_farm_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with eligible_farms as (
    select id from farms where benchmark_opt_in = true and id <> p_farm_id
  ),
  lot_metrics as (
    select
      cl.id as lot_id,
      cl.farm_id,
      latest.avg_weight_kg,
      latest.weighed_at,
      cl.entry_avg_weight_kg,
      cl.entry_date,
      cl.entry_head_count,
      cl.estimated_carcass_yield_pct,
      coalesce(mort.total_mortality, 0) as total_mortality,
      coalesce(costs.total_cost, 0) as total_cost
    from cattle_lots cl
    join eligible_farms ef on ef.id = cl.farm_id
    join lateral (
      select w.avg_weight_kg, w.weighed_at
      from cattle_lot_weighings w
      where w.lot_id = cl.id
      order by w.weighed_at desc
      limit 1
    ) latest on true
    left join lateral (
      select sum(m.head_count) as total_mortality from cattle_mortality_events m where m.lot_id = cl.id
    ) mort on true
    left join lateral (
      select sum(c.amount) as total_cost from cattle_lot_costs c where c.lot_id = cl.id
    ) costs on true
    where cl.status = 'ativo'
  ),
  computed as (
    select
      farm_id,
      (avg_weight_kg - entry_avg_weight_kg) / greatest(1, (weighed_at::date - entry_date)) as gmd_kg_day,
      case
        when (avg_weight_kg * greatest(0, entry_head_count - total_mortality) * estimated_carcass_yield_pct / 100 / 15) > 0
        then total_cost / (avg_weight_kg * greatest(0, entry_head_count - total_mortality) * estimated_carcass_yield_pct / 100 / 15)
        else null
      end as cost_per_arroba
    from lot_metrics
  ),
  per_farm as (
    select farm_id, avg(gmd_kg_day) as farm_gmd, avg(cost_per_arroba) as farm_cost_per_arroba
    from computed
    group by farm_id
  )
  select
    case when count(*) >= 3 then avg(farm_gmd) else null end,
    case when count(*) >= 3 then avg(farm_cost_per_arroba) else null end,
    count(*)::int
  from per_farm;
end;
$$;

grant execute on function public.regional_benchmark_corte(uuid) to authenticated;

-- Cria: taxa de prenhez média (% de diagnósticos positivos).
create or replace function public.regional_benchmark_cria(p_farm_id uuid)
returns table (
  regional_avg_pregnancy_rate_pct numeric,
  participant_farm_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with eligible_farms as (
    select id from farms where benchmark_opt_in = true and id <> p_farm_id
  ),
  diag as (
    select bc.farm_id, pd.result
    from pregnancy_diagnoses pd
    join inseminations i on i.id = pd.insemination_id
    join breeding_cows bc on bc.id = i.cow_id
    join eligible_farms ef on ef.id = bc.farm_id
  ),
  per_farm as (
    select farm_id, avg(case when result = 'positivo' then 100.0 else 0 end) as farm_rate
    from diag
    group by farm_id
  )
  select
    case when count(*) >= 3 then avg(farm_rate) else null end,
    count(*)::int
  from per_farm;
end;
$$;

grant execute on function public.regional_benchmark_cria(uuid) to authenticated;

-- Lavoura: produtividade média (sacas/ha) das safras colhidas.
create or replace function public.regional_benchmark_lavoura(p_farm_id uuid)
returns table (
  regional_avg_yield_sacas_ha numeric,
  participant_farm_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with eligible_farms as (
    select id from farms where benchmark_opt_in = true and id <> p_farm_id
  ),
  season_yield as (
    select
      p.farm_id,
      ps.id as season_id,
      ps.planted_area_hectares,
      coalesce(sum(he.quantity_sacas), 0) as total_sacas
    from plot_seasons ps
    join plots p on p.id = ps.plot_id
    join eligible_farms ef on ef.id = p.farm_id
    left join harvest_entries he on he.plot_season_id = ps.id
    where ps.status = 'colhida' and ps.planted_area_hectares > 0
    group by p.farm_id, ps.id, ps.planted_area_hectares
    having coalesce(sum(he.quantity_sacas), 0) > 0
  ),
  per_farm as (
    select farm_id, avg(total_sacas / planted_area_hectares) as farm_yield
    from season_yield
    group by farm_id
  )
  select
    case when count(*) >= 3 then avg(farm_yield) else null end,
    count(*)::int
  from per_farm;
end;
$$;

grant execute on function public.regional_benchmark_lavoura(uuid) to authenticated;
