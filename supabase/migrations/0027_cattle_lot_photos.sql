-- Foto diária do lote — registro visual simples (uma foto por vez, sem
-- categoria/status como as coletas de campo) pra criar, com o tempo, uma
-- espécie de timelapse do lote crescendo.
create table if not exists public.cattle_lot_photos (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.cattle_lots (id) on delete cascade,
  photo_url text not null,
  taken_at timestamptz not null default now()
);

create index if not exists cattle_lot_photos_lot_id_idx on public.cattle_lot_photos (lot_id);

alter table public.cattle_lot_photos enable row level security;

drop policy if exists "cattle_lot_photos_select" on public.cattle_lot_photos;
create policy "cattle_lot_photos_select" on public.cattle_lot_photos for select
  using (exists (
    select 1 from public.cattle_lots cl
    join public.farm_members fm on fm.farm_id = cl.farm_id
    where cl.id = cattle_lot_photos.lot_id and fm.user_id = auth.uid()
  ));

drop policy if exists "cattle_lot_photos_all" on public.cattle_lot_photos;
create policy "cattle_lot_photos_all" on public.cattle_lot_photos for all
  using (exists (
    select 1 from public.cattle_lots cl
    join public.farm_members fm on fm.farm_id = cl.farm_id
    where cl.id = cattle_lot_photos.lot_id and fm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.cattle_lots cl
    join public.farm_members fm on fm.farm_id = cl.farm_id
    where cl.id = cattle_lot_photos.lot_id and fm.user_id = auth.uid()
  ));
