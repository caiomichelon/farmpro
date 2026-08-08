-- Diaristas avulsos / mão de obra temporária — registro rápido de um dia de
-- trabalho de alguém sem vínculo fixo (sem passar pelo cadastro completo de
-- funcionário). Farm-wide, útil pros três setores (colheita, marcação,
-- reforma de cerca etc.).
create table if not exists public.casual_laborers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  worker_name text not null,
  work_date date not null default current_date,
  sector text not null default 'geral' check (sector in ('geral', 'lavoura', 'corte', 'cria')),
  task_description text,
  amount_paid numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists casual_laborers_farm_id_idx on public.casual_laborers (farm_id, work_date desc);

alter table public.casual_laborers enable row level security;

drop policy if exists "casual_laborers: membros da fazenda veem" on public.casual_laborers;
create policy "casual_laborers: membros da fazenda veem"
  on public.casual_laborers for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = casual_laborers.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "casual_laborers: membros da fazenda gerenciam" on public.casual_laborers;
create policy "casual_laborers: membros da fazenda gerenciam"
  on public.casual_laborers for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = casual_laborers.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = casual_laborers.farm_id and fm.user_id = auth.uid()
    )
  );
