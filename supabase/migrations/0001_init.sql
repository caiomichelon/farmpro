-- FarmPro — schema inicial (fundação)
-- Cobre: perfis de usuário, fazendas, vínculo usuário<->fazenda (com papel) e
-- talhões (usados no resumo da tela principal e, depois, pelo módulo Lavoura).

-- ── profiles ─────────────────────────────────────────────────────────────
-- Espelha auth.users com dados de app. Criado automaticamente via trigger
-- quando um usuário se cadastra.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: usuário vê e edita o próprio perfil" on public.profiles;
create policy "profiles: usuário vê e edita o próprio perfil"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── farms ────────────────────────────────────────────────────────────────
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.farms enable row level security;

-- ── farm_members ─────────────────────────────────────────────────────────
-- Base do sistema de permissões por perfil (administrador x funcionário de
-- campo) descrito no briefing. Por enquanto só 'admin' e 'campo'; o papel de
-- funcionário será detalhado no módulo de Gestão de Funcionários.
create table if not exists public.farm_members (
  farm_id uuid not null references public.farms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'campo')),
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);

alter table public.farm_members enable row level security;

drop policy if exists "farm_members: usuário vê seus próprios vínculos" on public.farm_members;
create policy "farm_members: usuário vê seus próprios vínculos"
  on public.farm_members for select
  using (auth.uid() = user_id);

drop policy if exists "farms: membros veem suas fazendas" on public.farms;
create policy "farms: membros veem suas fazendas"
  on public.farms for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farms.id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "farms: usuário autenticado pode criar fazenda" on public.farms;
create policy "farms: usuário autenticado pode criar fazenda"
  on public.farms for insert
  with check (auth.uid() = created_by);

drop policy if exists "farms: admin da fazenda pode editar" on public.farms;
create policy "farms: admin da fazenda pode editar"
  on public.farms for update
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farms.id and fm.user_id = auth.uid() and fm.role = 'admin'
    )
  );

-- Ao criar uma fazenda, o criador vira membro admin automaticamente.
create or replace function public.handle_new_farm()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.farm_members (farm_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

drop trigger if exists on_farm_created on public.farms;
create trigger on_farm_created
  after insert on public.farms
  for each row execute procedure public.handle_new_farm();

-- ── plots (talhões) ──────────────────────────────────────────────────────
-- Cadastro completo (cultura, produtividade histórica etc.) chega com o
-- módulo Lavoura. Por ora, os campos mínimos para o resumo da tela principal.
create table if not exists public.plots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  area_hectares numeric(10, 2) not null check (area_hectares > 0),
  type text not null check (type in ('lavoura', 'pecuaria')),
  created_at timestamptz not null default now()
);

alter table public.plots enable row level security;

drop policy if exists "plots: membros da fazenda veem os talhões" on public.plots;
create policy "plots: membros da fazenda veem os talhões"
  on public.plots for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = plots.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "plots: membros da fazenda gerenciam os talhões" on public.plots;
create policy "plots: membros da fazenda gerenciam os talhões"
  on public.plots for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = plots.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = plots.farm_id and fm.user_id = auth.uid()
    )
  );
