-- Cria tecnificada: diagnóstico de gestação (corrige a limitação de só
-- saber se prenhou quando o parto acontece — agora dá pra confirmar ou
-- descartar a prenhez em ~30 dias), desmame (peso e idade do bezerro ao
-- desmamar, que não era registrado em lugar nenhum) e pesagem/ECC da
-- própria matriz (nutrição afeta reprodução, é o indicador técnico mais
-- básico que faltava).

create table if not exists public.pregnancy_diagnoses (
  id uuid primary key default gen_random_uuid(),
  insemination_id uuid not null references public.inseminations (id) on delete cascade,
  diagnosis_date date not null default current_date,
  result text not null check (result in ('positivo', 'negativo', 'reabsorcao')),
  method text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pregnancy_diagnoses enable row level security;

drop policy if exists "pregnancy_diagnoses: membros da fazenda veem" on public.pregnancy_diagnoses;
create policy "pregnancy_diagnoses: membros da fazenda veem"
  on public.pregnancy_diagnoses for select
  using (
    exists (
      select 1 from public.inseminations i
      join public.breeding_cows bc on bc.id = i.cow_id
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where i.id = pregnancy_diagnoses.insemination_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "pregnancy_diagnoses: membros da fazenda gerenciam" on public.pregnancy_diagnoses;
create policy "pregnancy_diagnoses: membros da fazenda gerenciam"
  on public.pregnancy_diagnoses for all
  using (
    exists (
      select 1 from public.inseminations i
      join public.breeding_cows bc on bc.id = i.cow_id
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where i.id = pregnancy_diagnoses.insemination_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.inseminations i
      join public.breeding_cows bc on bc.id = i.cow_id
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where i.id = pregnancy_diagnoses.insemination_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.weanings (
  id uuid primary key default gen_random_uuid(),
  calving_id uuid not null references public.calvings (id) on delete cascade,
  weaning_date date not null default current_date,
  weight_kg numeric(8, 2) check (weight_kg > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.weanings enable row level security;

drop policy if exists "weanings: membros da fazenda veem" on public.weanings;
create policy "weanings: membros da fazenda veem"
  on public.weanings for select
  using (
    exists (
      select 1 from public.calvings c
      join public.breeding_cows bc on bc.id = c.cow_id
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where c.id = weanings.calving_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "weanings: membros da fazenda gerenciam" on public.weanings;
create policy "weanings: membros da fazenda gerenciam"
  on public.weanings for all
  using (
    exists (
      select 1 from public.calvings c
      join public.breeding_cows bc on bc.id = c.cow_id
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where c.id = weanings.calving_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.calvings c
      join public.breeding_cows bc on bc.id = c.cow_id
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where c.id = weanings.calving_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.cow_weighings (
  id uuid primary key default gen_random_uuid(),
  cow_id uuid not null references public.breeding_cows (id) on delete cascade,
  weighed_at date not null default current_date,
  weight_kg numeric(8, 2) not null check (weight_kg > 0),
  body_condition_score numeric(3, 1) check (body_condition_score between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.cow_weighings enable row level security;

drop policy if exists "cow_weighings: membros da fazenda veem" on public.cow_weighings;
create policy "cow_weighings: membros da fazenda veem"
  on public.cow_weighings for select
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = cow_weighings.cow_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "cow_weighings: membros da fazenda gerenciam" on public.cow_weighings;
create policy "cow_weighings: membros da fazenda gerenciam"
  on public.cow_weighings for all
  using (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = cow_weighings.cow_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.breeding_cows bc
      join public.farm_members fm on fm.farm_id = bc.farm_id
      where bc.id = cow_weighings.cow_id and fm.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.pregnancy_diagnoses to authenticated;
grant select, insert, update, delete on public.weanings to authenticated;
grant select, insert, update, delete on public.cow_weighings to authenticated;
