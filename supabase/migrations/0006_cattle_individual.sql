create table if not exists public.cattle_animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  tag_number text not null,
  sex text check (sex in ('macho', 'femea')),
  breed text,
  entry_weight_kg numeric(8, 2) check (entry_weight_kg > 0),
  entry_date date not null default current_date,
  status text not null default 'ativo'
    check (status in ('ativo', 'vendido', 'abatido', 'morto')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.cattle_animals enable row level security;
drop policy if exists "cattle_animals: membros da fazenda veem" on public.cattle_animals;
create policy "cattle_animals: membros da fazenda veem"
  on public.cattle_animals for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_animals.farm_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_animals: membros da fazenda gerenciam" on public.cattle_animals;
create policy "cattle_animals: membros da fazenda gerenciam"
  on public.cattle_animals for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_animals.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_animals.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cattle_animal_weighings (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.cattle_animals (id) on delete cascade,
  weighed_at date not null default current_date,
  weight_kg numeric(8, 2) not null check (weight_kg > 0),
  body_condition_score numeric(3, 1) check (body_condition_score between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.cattle_animal_weighings enable row level security;
drop policy if exists "cattle_animal_weighings: membros da fazenda veem" on public.cattle_animal_weighings;
create policy "cattle_animal_weighings: membros da fazenda veem"
  on public.cattle_animal_weighings for select
  using (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_weighings.animal_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_animal_weighings: membros da fazenda gerenciam" on public.cattle_animal_weighings;
create policy "cattle_animal_weighings: membros da fazenda gerenciam"
  on public.cattle_animal_weighings for all
  using (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_weighings.animal_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_weighings.animal_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cattle_animal_health_events (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.cattle_animals (id) on delete cascade,
  event_date date not null default current_date,
  event_type text not null check (event_type in ('vacina', 'tratamento', 'doenca', 'outro')),
  description text not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.cattle_animal_health_events enable row level security;
drop policy if exists "cattle_animal_health_events: membros da fazenda veem" on public.cattle_animal_health_events;
create policy "cattle_animal_health_events: membros da fazenda veem"
  on public.cattle_animal_health_events for select
  using (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_health_events.animal_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_animal_health_events: membros da fazenda gerenciam" on public.cattle_animal_health_events;
create policy "cattle_animal_health_events: membros da fazenda gerenciam"
  on public.cattle_animal_health_events for all
  using (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_health_events.animal_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_health_events.animal_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cattle_animal_movements (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.cattle_animals (id) on delete cascade,
  from_lot_id uuid references public.cattle_lots (id) on delete set null,
  to_lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  moved_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.cattle_animal_movements enable row level security;
drop policy if exists "cattle_animal_movements: membros da fazenda veem" on public.cattle_animal_movements;
create policy "cattle_animal_movements: membros da fazenda veem"
  on public.cattle_animal_movements for select
  using (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_movements.animal_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_animal_movements: membros da fazenda gerenciam" on public.cattle_animal_movements;
create policy "cattle_animal_movements: membros da fazenda gerenciam"
  on public.cattle_animal_movements for all
  using (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_movements.animal_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_animals ca
      join public.farm_members fm on fm.farm_id = ca.farm_id
      where ca.id = cattle_animal_movements.animal_id and fm.user_id = auth.uid()
    )
  );
