-- Farol de Cerca — mesmo modelo da aguada: status reportado na checagem
-- mais recente (Boa/Atenção/Ruim), sem conta de dias.
create table if not exists public.plot_cerca_events (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots (id) on delete cascade,
  checked_at date not null default current_date,
  status text not null check (status in ('boa', 'atencao', 'ruim')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists plot_cerca_events_plot_id_idx on public.plot_cerca_events (plot_id);

alter table public.plot_cerca_events enable row level security;

drop policy if exists "plot_cerca_events: membros da fazenda veem" on public.plot_cerca_events;
create policy "plot_cerca_events: membros da fazenda veem"
  on public.plot_cerca_events for select
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_cerca_events.plot_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "plot_cerca_events: membros da fazenda gerenciam" on public.plot_cerca_events;
create policy "plot_cerca_events: membros da fazenda gerenciam"
  on public.plot_cerca_events for all
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_cerca_events.plot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_cerca_events.plot_id and fm.user_id = auth.uid()
    )
  );

-- Farol de Altura de forragem — diferente dos dois acima: aqui é uma
-- medida (cm), comparada com uma altura mínima configurável por piquete
-- (cada piquete pode ter uma meta diferente, tipo o intervalo do cocho).
alter table public.plots add column if not exists forage_min_height_cm numeric(6,1) not null default 15 check (forage_min_height_cm > 0);

create table if not exists public.plot_forage_events (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots (id) on delete cascade,
  measured_at date not null default current_date,
  height_cm numeric(6,1) not null check (height_cm >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists plot_forage_events_plot_id_idx on public.plot_forage_events (plot_id);

alter table public.plot_forage_events enable row level security;

drop policy if exists "plot_forage_events: membros da fazenda veem" on public.plot_forage_events;
create policy "plot_forage_events: membros da fazenda veem"
  on public.plot_forage_events for select
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_forage_events.plot_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "plot_forage_events: membros da fazenda gerenciam" on public.plot_forage_events;
create policy "plot_forage_events: membros da fazenda gerenciam"
  on public.plot_forage_events for all
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_forage_events.plot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_forage_events.plot_id and fm.user_id = auth.uid()
    )
  );
