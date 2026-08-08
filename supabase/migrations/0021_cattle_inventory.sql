-- Estoque de insumos da pecuária (ração, núcleo/sal mineral, medicamento
-- veterinário, etc.) — o estoque atual é sempre calculado (inicial +
-- entradas - saídas), nunca guardado como campo solto, pra não desalinhar
-- com o histórico de movimentações.
create table if not exists public.cattle_inventory_items (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  category text not null check (category in ('racao', 'nucleo_mineral', 'medicamento', 'outro')),
  unit text not null check (unit in ('kg', 'saco', 'litro', 'dose', 'unidade')),
  initial_quantity numeric(12, 2) not null default 0 check (initial_quantity >= 0),
  min_quantity numeric(12, 2) check (min_quantity >= 0),
  unit_cost numeric(12, 2) check (unit_cost >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.cattle_inventory_items enable row level security;

drop policy if exists "cattle_inventory_items: membros da fazenda veem" on public.cattle_inventory_items;
create policy "cattle_inventory_items: membros da fazenda veem"
  on public.cattle_inventory_items for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_inventory_items.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "cattle_inventory_items: membros da fazenda gerenciam" on public.cattle_inventory_items;
create policy "cattle_inventory_items: membros da fazenda gerenciam"
  on public.cattle_inventory_items for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_inventory_items.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_inventory_items.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cattle_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.cattle_inventory_items (id) on delete cascade,
  type text not null check (type in ('entrada', 'saida')),
  quantity numeric(12, 2) not null check (quantity > 0),
  lot_id uuid references public.cattle_lots (id) on delete set null,
  notes text,
  moved_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists cattle_inventory_movements_item_id_idx on public.cattle_inventory_movements (item_id);

alter table public.cattle_inventory_movements enable row level security;

drop policy if exists "cattle_inventory_movements: membros da fazenda veem" on public.cattle_inventory_movements;
create policy "cattle_inventory_movements: membros da fazenda veem"
  on public.cattle_inventory_movements for select
  using (
    exists (
      select 1 from public.cattle_inventory_items ci
      join public.farm_members fm on fm.farm_id = ci.farm_id
      where ci.id = cattle_inventory_movements.item_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "cattle_inventory_movements: membros da fazenda gerenciam" on public.cattle_inventory_movements;
create policy "cattle_inventory_movements: membros da fazenda gerenciam"
  on public.cattle_inventory_movements for all
  using (
    exists (
      select 1 from public.cattle_inventory_items ci
      join public.farm_members fm on fm.farm_id = ci.farm_id
      where ci.id = cattle_inventory_movements.item_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_inventory_items ci
      join public.farm_members fm on fm.farm_id = ci.farm_id
      where ci.id = cattle_inventory_movements.item_id and fm.user_id = auth.uid()
    )
  );
