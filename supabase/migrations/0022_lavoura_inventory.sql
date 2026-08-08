-- Estoque de insumos da Lavoura (sementes, fertilizante, defensivo,
-- combustível) — mesmo desenho do estoque da Pecuária (0021): a
-- quantidade atual nunca fica guardada solta, é sempre inicial + entradas
-- - saídas, calculada a partir do histórico de movimentações.
create table if not exists public.lavoura_inventory_items (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  category text not null check (category in ('sementes', 'fertilizante', 'defensivo', 'combustivel', 'outro')),
  unit text not null check (unit in ('kg', 'saco', 'litro', 'dose', 'unidade')),
  initial_quantity numeric(12, 2) not null default 0 check (initial_quantity >= 0),
  min_quantity numeric(12, 2) check (min_quantity >= 0),
  unit_cost numeric(12, 2) check (unit_cost >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.lavoura_inventory_items enable row level security;

drop policy if exists "lavoura_inventory_items: membros da fazenda veem" on public.lavoura_inventory_items;
create policy "lavoura_inventory_items: membros da fazenda veem"
  on public.lavoura_inventory_items for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = lavoura_inventory_items.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "lavoura_inventory_items: membros da fazenda gerenciam" on public.lavoura_inventory_items;
create policy "lavoura_inventory_items: membros da fazenda gerenciam"
  on public.lavoura_inventory_items for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = lavoura_inventory_items.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = lavoura_inventory_items.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.lavoura_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lavoura_inventory_items (id) on delete cascade,
  type text not null check (type in ('entrada', 'saida')),
  quantity numeric(12, 2) not null check (quantity > 0),
  plot_season_id uuid references public.plot_seasons (id) on delete set null,
  notes text,
  moved_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists lavoura_inventory_movements_item_id_idx on public.lavoura_inventory_movements (item_id);

alter table public.lavoura_inventory_movements enable row level security;

drop policy if exists "lavoura_inventory_movements: membros da fazenda veem" on public.lavoura_inventory_movements;
create policy "lavoura_inventory_movements: membros da fazenda veem"
  on public.lavoura_inventory_movements for select
  using (
    exists (
      select 1 from public.lavoura_inventory_items li
      join public.farm_members fm on fm.farm_id = li.farm_id
      where li.id = lavoura_inventory_movements.item_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "lavoura_inventory_movements: membros da fazenda gerenciam" on public.lavoura_inventory_movements;
create policy "lavoura_inventory_movements: membros da fazenda gerenciam"
  on public.lavoura_inventory_movements for all
  using (
    exists (
      select 1 from public.lavoura_inventory_items li
      join public.farm_members fm on fm.farm_id = li.farm_id
      where li.id = lavoura_inventory_movements.item_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lavoura_inventory_items li
      join public.farm_members fm on fm.farm_id = li.farm_id
      where li.id = lavoura_inventory_movements.item_id and fm.user_id = auth.uid()
    )
  );
