-- Farol do cocho — cada vez que alguém abastece o cocho de um piquete, fica
-- registrado aqui. O "farol" (cor no mapa) é calculado no app a partir do
-- último abastecimento + o intervalo esperado de cada piquete, não guardado
-- pronto no banco (senão precisaria recalcular/atualizar toda hora).
alter table public.plots add column if not exists cocho_interval_days integer not null default 4 check (cocho_interval_days > 0);

create table if not exists public.plot_cocho_events (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots (id) on delete cascade,
  refilled_at date not null default current_date,
  product text,
  sacos numeric(10,1),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists plot_cocho_events_plot_id_idx on public.plot_cocho_events (plot_id);

alter table public.plot_cocho_events enable row level security;

drop policy if exists "plot_cocho_events: membros da fazenda veem" on public.plot_cocho_events;
create policy "plot_cocho_events: membros da fazenda veem"
  on public.plot_cocho_events for select
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_cocho_events.plot_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "plot_cocho_events: membros da fazenda gerenciam" on public.plot_cocho_events;
create policy "plot_cocho_events: membros da fazenda gerenciam"
  on public.plot_cocho_events for all
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_cocho_events.plot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_cocho_events.plot_id and fm.user_id = auth.uid()
    )
  );
