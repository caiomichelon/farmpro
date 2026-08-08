-- Registro de aplicação de defensivo (receituário) — separado do custo
-- (production_costs já cobre isso, categoria 'defensivo'). Aqui é o
-- registro agronômico/legal: produto, dose, praga/doença alvo, e o período
-- de carência (dias até poder colher com segurança) — o receituário
-- agronômico é obrigatório por lei no Brasil pra aplicação de defensivo.
create table if not exists public.pesticide_applications (
  id uuid primary key default gen_random_uuid(),
  plot_season_id uuid not null references public.plot_seasons (id) on delete cascade,
  product_name text not null,
  target_pest text,
  dose_per_hectare numeric(12, 3) not null check (dose_per_hectare > 0),
  dose_unit text not null default 'L/ha',
  area_hectares numeric(12, 2) not null check (area_hectares > 0),
  applied_at date not null default current_date,
  pre_harvest_interval_days integer,
  applicator_name text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists pesticide_applications_plot_season_id_idx on public.pesticide_applications (plot_season_id, applied_at desc);

alter table public.pesticide_applications enable row level security;

drop policy if exists "pesticide_applications: membros da fazenda veem" on public.pesticide_applications;
create policy "pesticide_applications: membros da fazenda veem"
  on public.pesticide_applications for select
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = pesticide_applications.plot_season_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "pesticide_applications: membros da fazenda gerenciam" on public.pesticide_applications;
create policy "pesticide_applications: membros da fazenda gerenciam"
  on public.pesticide_applications for all
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = pesticide_applications.plot_season_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = pesticide_applications.plot_season_id and fm.user_id = auth.uid()
    )
  );
