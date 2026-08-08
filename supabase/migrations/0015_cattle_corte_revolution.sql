-- Revolução do Corte: meta de peso de abate (pra saber quais lotes estão
-- prontos pra vender, sem precisar abrir cada um), rendimento de carcaça
-- estimado (pra projeção financeira antes do abate de verdade) e custos por
-- lote (ração, sanidade, frete, mão de obra) — hoje não existia NENHUM
-- controle de custo pra pecuária de corte, só pra lavoura.

alter table public.cattle_lots add column if not exists target_slaughter_weight_kg numeric(8, 2);
alter table public.cattle_lots add column if not exists estimated_carcass_yield_pct numeric(5, 2) not null default 50;

create table if not exists public.cattle_lot_costs (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  category text not null check (category in ('racao', 'sanidade', 'frete', 'mao_de_obra', 'outro')),
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  applied_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.cattle_lot_costs enable row level security;

drop policy if exists "cattle_lot_costs: membros da fazenda veem" on public.cattle_lot_costs;
create policy "cattle_lot_costs: membros da fazenda veem"
  on public.cattle_lot_costs for select
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_lot_costs.lot_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "cattle_lot_costs: membros da fazenda gerenciam" on public.cattle_lot_costs;
create policy "cattle_lot_costs: membros da fazenda gerenciam"
  on public.cattle_lot_costs for all
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_lot_costs.lot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_lot_costs.lot_id and fm.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.cattle_lot_costs to authenticated;
