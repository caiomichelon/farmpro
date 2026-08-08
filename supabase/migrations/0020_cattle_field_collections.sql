-- Coletas de campo por lote (inspirado em apps de monitoramento de campo já
-- usados no setor): o funcionário passa no pasto/curral do lote e registra
-- uma checagem rápida — categoria + situação, com foto e localização como
-- evidência de que ele foi lá de verdade.
create table if not exists public.cattle_field_collections (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  category text not null check (
    category in ('suplementacao', 'altura_forragem', 'rebanho', 'aguada', 'sanidade', 'cerca')
  ),
  status text not null check (
    status in ('dentro_padrao', 'fora_padrao', 'atencao', 'acima_padrao', 'nao_realizada', 'ausencia_gado')
  ),
  notes text,
  photo_url text,
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists cattle_field_collections_lot_id_idx on public.cattle_field_collections (lot_id);

alter table public.cattle_field_collections enable row level security;

drop policy if exists "cattle_field_collections: membros da fazenda veem" on public.cattle_field_collections;
create policy "cattle_field_collections: membros da fazenda veem"
  on public.cattle_field_collections for select
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_field_collections.lot_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "cattle_field_collections: membros da fazenda gerenciam" on public.cattle_field_collections;
create policy "cattle_field_collections: membros da fazenda gerenciam"
  on public.cattle_field_collections for all
  using (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_field_collections.lot_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cattle_lots cl
      join public.farm_members fm on fm.farm_id = cl.farm_id
      where cl.id = cattle_field_collections.lot_id and fm.user_id = auth.uid()
    )
  );
