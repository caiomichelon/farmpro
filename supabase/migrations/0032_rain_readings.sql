-- Pluviômetro manual — chuva do dia lançada pelo produtor (mm), pra
-- acompanhar o acumulado por mês/safra. Ferramenta clássica de gestão de
-- fazenda, cruza com os alertas de clima que já existem.
create table if not exists public.rain_readings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  reading_date date not null,
  mm numeric(6, 1) not null check (mm >= 0),
  created_at timestamptz not null default now(),
  unique (farm_id, reading_date)
);

create index if not exists rain_readings_farm_id_idx on public.rain_readings (farm_id, reading_date desc);

alter table public.rain_readings enable row level security;

drop policy if exists "rain_readings: membros da fazenda veem" on public.rain_readings;
create policy "rain_readings: membros da fazenda veem"
  on public.rain_readings for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = rain_readings.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "rain_readings: membros da fazenda gerenciam" on public.rain_readings;
create policy "rain_readings: membros da fazenda gerenciam"
  on public.rain_readings for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = rain_readings.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = rain_readings.farm_id and fm.user_id = auth.uid()
    )
  );
