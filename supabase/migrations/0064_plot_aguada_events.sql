-- Farol de Aguada — diferente do cocho (que vence por dias passados), a
-- água é um status direto reportado por quem for conferir: Boa, Atenção ou
-- Ruim. O farol no mapa usa sempre o status da checagem mais recente.
create table if not exists public.plot_aguada_events (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots (id) on delete cascade,
  checked_at date not null default current_date,
  status text not null check (status in ('boa', 'atencao', 'ruim')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists plot_aguada_events_plot_id_idx on public.plot_aguada_events (plot_id);

alter table public.plot_aguada_events enable row level security;

drop policy if exists "plot_aguada_events: membros da fazenda veem" on public.plot_aguada_events;
create policy "plot_aguada_events: membros da fazenda veem"
  on public.plot_aguada_events for select
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_aguada_events.plot_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "plot_aguada_events: membros da fazenda gerenciam" on public.plot_aguada_events;
create policy "plot_aguada_events: membros da fazenda gerenciam"
  on public.plot_aguada_events for all
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_aguada_events.plot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_aguada_events.plot_id and fm.user_id = auth.uid()
    )
  );
