-- "Setores" leves de gado — grupos de animais organizados por atividade
-- (pasto, suplementação proteica, etc.), separados do módulo de Corte
-- (semi-confinamento), que já tem seu próprio controle completo (peso,
-- pesagens, meta, custo). Aqui é só uma contagem rápida por setor, pensado
-- pra ser fácil de mexer pra quem não usa o app o tempo todo — sem lista
-- fixa de setores: o nome é texto livre, criado na hora por quem for usar
-- (ex.: "Pasto", "Proteico", "Pasto do fundo").
create table if not exists public.cattle_activity_groups (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  sector_name text not null,
  head_count integer not null default 0 check (head_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cattle_activity_groups_farm_id_idx on public.cattle_activity_groups (farm_id);

alter table public.cattle_activity_groups enable row level security;

drop policy if exists "cattle_activity_groups: membros da fazenda veem" on public.cattle_activity_groups;
create policy "cattle_activity_groups: membros da fazenda veem"
  on public.cattle_activity_groups for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_activity_groups.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "cattle_activity_groups: membros da fazenda gerenciam" on public.cattle_activity_groups;
create policy "cattle_activity_groups: membros da fazenda gerenciam"
  on public.cattle_activity_groups for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_activity_groups.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = cattle_activity_groups.farm_id and fm.user_id = auth.uid()
    )
  );
