-- Protocolo sanitário: um "modelo" de vacina/tratamento recorrente da
-- fazenda (ex.: "Aftosa" a cada 180 dias). Ao registrar um evento de saúde
-- de um animal escolhendo um protocolo, a próxima dose é calculada sozinha
-- (data do evento + intervalo do protocolo), sem precisar decorar prazo.
create table if not exists public.cattle_health_protocols (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  event_type text not null check (event_type in ('vacina', 'tratamento', 'doenca', 'outro')),
  interval_days integer not null check (interval_days > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.cattle_health_protocols enable row level security;

drop policy if exists "cattle_health_protocols: membros da fazenda veem" on public.cattle_health_protocols;
create policy "cattle_health_protocols: membros da fazenda veem"
  on public.cattle_health_protocols for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_health_protocols.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "cattle_health_protocols: membros da fazenda gerenciam" on public.cattle_health_protocols;
create policy "cattle_health_protocols: membros da fazenda gerenciam"
  on public.cattle_health_protocols for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_health_protocols.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_health_protocols.farm_id and fm.user_id = auth.uid()
    )
  );

-- Liga o evento de saúde ao protocolo que o gerou, quando houver um.
alter table public.cattle_animal_health_events
  add column if not exists protocol_id uuid references public.cattle_health_protocols (id) on delete set null;
