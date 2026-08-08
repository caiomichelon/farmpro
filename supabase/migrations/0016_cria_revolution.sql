-- Revolução da Cria/Reprodução: mesmo tratamento dado ao Corte —
-- custos por matriz (não existia nenhum controle de custo pra cria) como
-- base do "custo por bezerro produzido".

create table if not exists public.breeding_cow_costs (
  id uuid primary key default gen_random_uuid(),
  cow_id uuid not null references public.breeding_cows (id) on delete cascade,
  category text not null check (category in ('racao', 'sanidade', 'mao_de_obra', 'outro')),
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  applied_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.breeding_cow_costs enable row level security;

drop policy if exists "breeding_cow_costs: membros da fazenda veem" on public.breeding_cow_costs;
create policy "breeding_cow_costs: membros da fazenda veem"
  on public.breeding_cow_costs for select
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = breeding_cow_costs.cow_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "breeding_cow_costs: membros da fazenda gerenciam" on public.breeding_cow_costs;
create policy "breeding_cow_costs: membros da fazenda gerenciam"
  on public.breeding_cow_costs for all
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = breeding_cow_costs.cow_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = breeding_cow_costs.cow_id and fm.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.breeding_cow_costs to authenticated;
