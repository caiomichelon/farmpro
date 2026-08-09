-- Permite lançar nota de colheita e venda de grão direto na fazenda, sem
-- exigir talhão e safra cadastrados — pra quem só quer "lançar as notas dos
-- caminhões" sem se importar com essa organização.
--
-- plot_season_id continua sendo o jeito de amarrar a um talhão/safra
-- específico (quem usa isso continua exatamente igual); farm_id é o jeito
-- "solto", direto na fazenda. Toda linha tem exatamente um dos dois — nunca
-- os dois, nunca nenhum.

alter table public.harvest_entries
  alter column plot_season_id drop not null,
  add column if not exists farm_id uuid references public.farms (id) on delete cascade;

alter table public.harvest_entries
  drop constraint if exists harvest_entries_season_or_farm,
  add constraint harvest_entries_season_or_farm
    check ((plot_season_id is not null) <> (farm_id is not null));

create index if not exists harvest_entries_farm_id_idx on public.harvest_entries (farm_id);

-- Políticas novas, aditivas — cobrem só as linhas soltas (farm_id preenchido).
-- As políticas antigas (via plot_season_id) continuam intactas e seguem
-- cobrindo as linhas amarradas a talhão/safra, sem nenhuma mudança nelas.
drop policy if exists "harvest_entries: membros da fazenda veem (direto)" on public.harvest_entries;
create policy "harvest_entries: membros da fazenda veem (direto)"
  on public.harvest_entries for select
  using (
    farm_id is not null
    and exists (select 1 from public.farm_members fm where fm.farm_id = harvest_entries.farm_id and fm.user_id = auth.uid())
  );

drop policy if exists "harvest_entries: membros da fazenda gerenciam (direto)" on public.harvest_entries;
create policy "harvest_entries: membros da fazenda gerenciam (direto)"
  on public.harvest_entries for all
  using (
    farm_id is not null
    and exists (select 1 from public.farm_members fm where fm.farm_id = harvest_entries.farm_id and fm.user_id = auth.uid())
  )
  with check (
    farm_id is not null
    and exists (select 1 from public.farm_members fm where fm.farm_id = harvest_entries.farm_id and fm.user_id = auth.uid())
  );

-- ── mesma coisa pra grain_sales ─────────────────────────────────────────────

alter table public.grain_sales
  alter column plot_season_id drop not null,
  add column if not exists farm_id uuid references public.farms (id) on delete cascade;

alter table public.grain_sales
  drop constraint if exists grain_sales_season_or_farm,
  add constraint grain_sales_season_or_farm
    check ((plot_season_id is not null) <> (farm_id is not null));

create index if not exists grain_sales_farm_id_idx on public.grain_sales (farm_id);

drop policy if exists "grain_sales: membros da fazenda veem (direto)" on public.grain_sales;
create policy "grain_sales: membros da fazenda veem (direto)"
  on public.grain_sales for select
  using (
    farm_id is not null
    and exists (select 1 from public.farm_members fm where fm.farm_id = grain_sales.farm_id and fm.user_id = auth.uid())
  );

drop policy if exists "grain_sales: membros da fazenda gerenciam (direto)" on public.grain_sales;
create policy "grain_sales: membros da fazenda gerenciam (direto)"
  on public.grain_sales for all
  using (
    farm_id is not null
    and exists (select 1 from public.farm_members fm where fm.farm_id = grain_sales.farm_id and fm.user_id = auth.uid())
  )
  with check (
    farm_id is not null
    and exists (select 1 from public.farm_members fm where fm.farm_id = grain_sales.farm_id and fm.user_id = auth.uid())
  );
