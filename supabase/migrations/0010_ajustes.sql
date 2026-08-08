-- Suporte à tela de Ajustes: conta (e-mail visível), notificações
-- (preferências por tipo de alerta) e fazendas/membros (convite por código).

-- ── profiles: e-mail + preferências de alerta ───────────────────────────
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists alert_preferences jsonb not null default '{}'::jsonb;

-- Backfill do e-mail pra quem já tinha conta antes dessa coluna existir.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- A partir de agora, grava o e-mail junto no cadastro do perfil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

-- ── farm_invites: convite por código pra entrar numa fazenda ───────────
create table if not exists public.farm_invites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  code text not null unique,
  role text not null default 'campo' check (role in ('admin', 'campo')),
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.farm_invites enable row level security;

drop policy if exists "farm_invites: admin da fazenda gerencia" on public.farm_invites;
create policy "farm_invites: admin da fazenda gerencia"
  on public.farm_invites for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_invites.farm_id and fm.user_id = auth.uid() and fm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_invites.farm_id and fm.user_id = auth.uid() and fm.role = 'admin'
    )
  );

-- Quem ainda não é membro não enxerga farm_invites via RLS normal (nem
-- deveria — só tem o código). A entrada acontece via função abaixo,
-- rodando com privilégio elevado só pra essa operação específica.
create or replace function public.join_farm_by_code(invite_code text)
returns table (farm_id uuid, farm_name text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite record;
begin
  select fi.id, fi.farm_id, fi.role, fi.expires_at
    into v_invite
  from public.farm_invites fi
  where fi.code = upper(trim(invite_code));

  if not found then
    raise exception 'Código de convite inválido.';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'Esse código de convite expirou.';
  end if;

  insert into public.farm_members (farm_id, user_id, role)
  values (v_invite.farm_id, auth.uid(), v_invite.role)
  on conflict (farm_id, user_id) do nothing;

  return query select f.id, f.name from public.farms f where f.id = v_invite.farm_id;
end;
$$;

grant execute on function public.join_farm_by_code(text) to authenticated;

-- Membros de uma fazenda precisam ver os perfis uns dos outros (nome/e-mail)
-- pra tela de "Membros da fazenda" fazer sentido — sem isso, RLS de
-- profiles (só o próprio perfil) impediria enxergar quem mais tem acesso.
drop policy if exists "profiles: membros da mesma fazenda se veem" on public.profiles;
create policy "profiles: membros da mesma fazenda se veem"
  on public.profiles for select
  using (
    exists (
      select 1 from public.farm_members fm1
      join public.farm_members fm2 on fm2.farm_id = fm1.farm_id
      where fm1.user_id = auth.uid() and fm2.user_id = profiles.id
    )
  );
