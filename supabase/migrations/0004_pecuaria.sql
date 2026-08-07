create table if not exists public.cattle_lots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  plot_id uuid references public.plots (id) on delete set null,
  name text not null,
  entry_date date not null default current_date,
  entry_head_count integer not null check (entry_head_count > 0),
  entry_avg_weight_kg numeric(8, 2) not null check (entry_avg_weight_kg > 0),
  status text not null default 'ativo'
    check (status in ('ativo', 'vendido', 'abatido')),
  created_at timestamptz not null default now()
);
alter table public.cattle_lots enable row level security;
drop policy if exists "cattle_lots: membros da fazenda veem" on public.cattle_lots;
create policy "cattle_lots: membros da fazenda veem"
  on public.cattle_lots for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_lots.farm_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_lots: membros da fazenda gerenciam" on public.cattle_lots;
create policy "cattle_lots: membros da fazenda gerenciam"
  on public.cattle_lots for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_lots.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_lots.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cattle_lot_weighings (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  weighed_at date not null default current_date,
  avg_weight_kg numeric(8, 2) not null check (avg_weight_kg > 0),
  head_count integer,
  body_condition_score numeric(3, 1) check (body_condition_score between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.cattle_lot_weighings enable row level security;
drop policy if exists "cattle_lot_weighings: membros da fazenda veem" on public.cattle_lot_weighings;
create policy "cattle_lot_weighings: membros da fazenda veem"
  on public.cattle_lot_weighings for select
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_lot_weighings.lot_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_lot_weighings: membros da fazenda gerenciam" on public.cattle_lot_weighings;
create policy "cattle_lot_weighings: membros da fazenda gerenciam"
  on public.cattle_lot_weighings for all
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_lot_weighings.lot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_lot_weighings.lot_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cattle_mortality_events (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  event_date date not null default current_date,
  head_count integer not null check (head_count > 0),
  cause text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.cattle_mortality_events enable row level security;
drop policy if exists "cattle_mortality_events: membros da fazenda veem" on public.cattle_mortality_events;
create policy "cattle_mortality_events: membros da fazenda veem"
  on public.cattle_mortality_events for select
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_mortality_events.lot_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_mortality_events: membros da fazenda gerenciam" on public.cattle_mortality_events;
create policy "cattle_mortality_events: membros da fazenda gerenciam"
  on public.cattle_mortality_events for all
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_mortality_events.lot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_mortality_events.lot_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.slaughterhouses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.slaughterhouses enable row level security;
drop policy if exists "slaughterhouses: membros da fazenda veem" on public.slaughterhouses;
create policy "slaughterhouses: membros da fazenda veem"
  on public.slaughterhouses for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = slaughterhouses.farm_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "slaughterhouses: membros da fazenda gerenciam" on public.slaughterhouses;
create policy "slaughterhouses: membros da fazenda gerenciam"
  on public.slaughterhouses for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = slaughterhouses.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = slaughterhouses.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cattle_slaughters (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  slaughterhouse_id uuid references public.slaughterhouses (id),
  slaughter_date date not null default current_date,
  head_count integer not null check (head_count > 0),
  exit_avg_weight_kg numeric(8, 2) not null check (exit_avg_weight_kg > 0),
  carcass_yield_pct numeric(5, 2) check (carcass_yield_pct between 0 and 100),
  fat_finish_score integer check (fat_finish_score between 1 and 5),
  feed_conversion_ratio numeric(6, 2),
  price_per_arroba numeric(10, 2) not null check (price_per_arroba > 0),
  next_slaughter_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.cattle_slaughters enable row level security;
drop policy if exists "cattle_slaughters: membros da fazenda veem" on public.cattle_slaughters;
create policy "cattle_slaughters: membros da fazenda veem"
  on public.cattle_slaughters for select
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_slaughters.lot_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "cattle_slaughters: membros da fazenda gerenciam" on public.cattle_slaughters;
create policy "cattle_slaughters: membros da fazenda gerenciam"
  on public.cattle_slaughters for all
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_slaughters.lot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_slaughters.lot_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.breeding_cows (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  identification text not null,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.breeding_cows enable row level security;
drop policy if exists "breeding_cows: membros da fazenda veem" on public.breeding_cows;
create policy "breeding_cows: membros da fazenda veem"
  on public.breeding_cows for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = breeding_cows.farm_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "breeding_cows: membros da fazenda gerenciam" on public.breeding_cows;
create policy "breeding_cows: membros da fazenda gerenciam"
  on public.breeding_cows for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = breeding_cows.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = breeding_cows.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.inseminations (
  id uuid primary key default gen_random_uuid(),
  cow_id uuid not null references public.breeding_cows (id) on delete cascade,
  insemination_date date not null default current_date,
  veterinarian text,
  method text,
  sire_or_semen text,
  expected_calving_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.inseminations enable row level security;
drop policy if exists "inseminations: membros da fazenda veem" on public.inseminations;
create policy "inseminations: membros da fazenda veem"
  on public.inseminations for select
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = inseminations.cow_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "inseminations: membros da fazenda gerenciam" on public.inseminations;
create policy "inseminations: membros da fazenda gerenciam"
  on public.inseminations for all
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = inseminations.cow_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = inseminations.cow_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.calvings (
  id uuid primary key default gen_random_uuid(),
  cow_id uuid not null references public.breeding_cows (id) on delete cascade,
  insemination_id uuid references public.inseminations (id) on delete set null,
  calving_date date not null default current_date,
  calf_count integer not null default 1 check (calf_count > 0),
  calf_identification text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.calvings enable row level security;
drop policy if exists "calvings: membros da fazenda veem" on public.calvings;
create policy "calvings: membros da fazenda veem"
  on public.calvings for select
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = calvings.cow_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "calvings: membros da fazenda gerenciam" on public.calvings;
create policy "calvings: membros da fazenda gerenciam"
  on public.calvings for all
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = calvings.cow_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = calvings.cow_id and fm.user_id = auth.uid()
    )
  );
