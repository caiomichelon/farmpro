-- FarmPro — módulo Lavoura: safras, custo de produção, colheita, vendas e
-- compradores de grão.
--
-- O talhão em si (public.plots) já existe desde 0001_init.sql. Aqui entra o
-- que varia por SAFRA (ciclo de plantio) de cada talhão — é o eixo que
-- conecta cultura, variedade, custo, colheita e venda, e junto formam o
-- histórico de rotação de cultura e produtividade do talhão.

-- ── plot_seasons (safra por talhão) ─────────────────────────────────────────
create table if not exists public.plot_seasons (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots (id) on delete cascade,
  season_label text not null,               -- ex.: "2025/2026"
  crop text not null,                        -- ex.: "Soja", "Milho", "Algodão"
  variety text,                              -- variedade de semente
  planted_area_hectares numeric(10, 2) not null check (planted_area_hectares > 0),
  planting_date date,
  status text not null default 'plantada'
    check (status in ('planejada', 'plantada', 'colhendo', 'colhida')),
  created_at timestamptz not null default now()
);

alter table public.plot_seasons enable row level security;

drop policy if exists "plot_seasons: membros da fazenda veem" on public.plot_seasons;
create policy "plot_seasons: membros da fazenda veem"
  on public.plot_seasons for select
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_seasons.plot_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "plot_seasons: membros da fazenda gerenciam" on public.plot_seasons;
create policy "plot_seasons: membros da fazenda gerenciam"
  on public.plot_seasons for all
  using (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_seasons.plot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plots p
      join public.farm_members fm on fm.farm_id = p.farm_id
      where p.id = plot_seasons.plot_id and fm.user_id = auth.uid()
    )
  );

-- ── production_costs (custo de produção / insumos) ──────────────────────────
-- Categorias 'adubo' e 'defensivo' também servem como o histórico de
-- aplicação pedido no briefing (a data fica em applied_at).
create table if not exists public.production_costs (
  id uuid primary key default gen_random_uuid(),
  plot_season_id uuid not null references public.plot_seasons (id) on delete cascade,
  category text not null
    check (category in ('semente', 'adubo', 'defensivo', 'combustivel', 'mao_de_obra', 'outro')),
  description text not null,
  quantity numeric(12, 2),
  unit text,                       -- ex.: 'kg', 'L', 'saca', 'un'
  unit_cost numeric(12, 2),
  total_cost numeric(12, 2) not null check (total_cost >= 0),
  applied_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.production_costs enable row level security;

drop policy if exists "production_costs: membros da fazenda veem" on public.production_costs;
create policy "production_costs: membros da fazenda veem"
  on public.production_costs for select
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = production_costs.plot_season_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "production_costs: membros da fazenda gerenciam" on public.production_costs;
create policy "production_costs: membros da fazenda gerenciam"
  on public.production_costs for all
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = production_costs.plot_season_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = production_costs.plot_season_id and fm.user_id = auth.uid()
    )
  );

-- ── harvest_entries (colheita em tempo real) ────────────────────────────────
create table if not exists public.harvest_entries (
  id uuid primary key default gen_random_uuid(),
  plot_season_id uuid not null references public.plot_seasons (id) on delete cascade,
  harvested_at date not null default current_date,
  quantity_sacas numeric(12, 2) not null check (quantity_sacas > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.harvest_entries enable row level security;

drop policy if exists "harvest_entries: membros da fazenda veem" on public.harvest_entries;
create policy "harvest_entries: membros da fazenda veem"
  on public.harvest_entries for select
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = harvest_entries.plot_season_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "harvest_entries: membros da fazenda gerenciam" on public.harvest_entries;
create policy "harvest_entries: membros da fazenda gerenciam"
  on public.harvest_entries for all
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = harvest_entries.plot_season_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = harvest_entries.plot_season_id and fm.user_id = auth.uid()
    )
  );

-- ── grain_buyers (compradores de grão: tradings/cerealistas) ───────────────
create table if not exists public.grain_buyers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.grain_buyers enable row level security;

drop policy if exists "grain_buyers: membros da fazenda veem" on public.grain_buyers;
create policy "grain_buyers: membros da fazenda veem"
  on public.grain_buyers for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = grain_buyers.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "grain_buyers: membros da fazenda gerenciam" on public.grain_buyers;
create policy "grain_buyers: membros da fazenda gerenciam"
  on public.grain_buyers for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = grain_buyers.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = grain_buyers.farm_id and fm.user_id = auth.uid()
    )
  );

-- ── grain_sales (venda de grão) ─────────────────────────────────────────────
-- Fica dentro da área de colheita no app (é lançada a partir da tela de
-- colheita de uma safra), com o comprador e o preço pago detalhados.
create table if not exists public.grain_sales (
  id uuid primary key default gen_random_uuid(),
  plot_season_id uuid not null references public.plot_seasons (id) on delete cascade,
  buyer_id uuid references public.grain_buyers (id),
  sale_date date not null default current_date,
  quantity_sacas numeric(12, 2) not null check (quantity_sacas > 0),
  price_per_saca numeric(12, 2) not null check (price_per_saca > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.grain_sales enable row level security;

drop policy if exists "grain_sales: membros da fazenda veem" on public.grain_sales;
create policy "grain_sales: membros da fazenda veem"
  on public.grain_sales for select
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = grain_sales.plot_season_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "grain_sales: membros da fazenda gerenciam" on public.grain_sales;
create policy "grain_sales: membros da fazenda gerenciam"
  on public.grain_sales for all
  using (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = grain_sales.plot_season_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plot_seasons ps
      join public.plots p on p.id = ps.plot_id
      join public.farm_members fm on fm.farm_id = p.farm_id
      where ps.id = grain_sales.plot_season_id and fm.user_id = auth.uid()
    )
  );
