-- Manutenção de maquinário — cadastra trator/implemento e registra as
-- manutenções (revisão, troca de óleo etc.), com data prevista da próxima
-- pra avisar quando estiver vencendo. Farm-wide, não é por setor (o mesmo
-- trator serve lavoura e pecuária).
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists equipment_farm_id_idx on public.equipment (farm_id);

alter table public.equipment enable row level security;

drop policy if exists "equipment: membros da fazenda veem" on public.equipment;
create policy "equipment: membros da fazenda veem"
  on public.equipment for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = equipment.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "equipment: membros da fazenda gerenciam" on public.equipment;
create policy "equipment: membros da fazenda gerenciam"
  on public.equipment for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = equipment.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = equipment.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.equipment_maintenance (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  maintenance_type text not null,
  performed_at date not null default current_date,
  next_due_date date,
  cost numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists equipment_maintenance_equipment_id_idx on public.equipment_maintenance (equipment_id, performed_at desc);

alter table public.equipment_maintenance enable row level security;

drop policy if exists "equipment_maintenance: membros da fazenda veem" on public.equipment_maintenance;
create policy "equipment_maintenance: membros da fazenda veem"
  on public.equipment_maintenance for select
  using (
    exists (
      select 1 from public.equipment e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = equipment_maintenance.equipment_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "equipment_maintenance: membros da fazenda gerenciam" on public.equipment_maintenance;
create policy "equipment_maintenance: membros da fazenda gerenciam"
  on public.equipment_maintenance for all
  using (
    exists (
      select 1 from public.equipment e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = equipment_maintenance.equipment_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.equipment e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = equipment_maintenance.equipment_id and fm.user_id = auth.uid()
    )
  );
