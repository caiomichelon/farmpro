-- Bug real encontrado testando: a policy de farm_members de 0012 fazia um
-- EXISTS consultando a própria tabela farm_members pra checar associação —
-- isso reaplica a mesma policy recursivamente (Postgres detecta e derruba
-- com "infinite recursion detected in policy for relation farm_members"),
-- o que quebrou toda leitura de farms/farm_members pro app inteiro.
--
-- Fix padrão pra esse caso: uma função SECURITY DEFINER que consulta
-- farm_members SEM reaplicar RLS (porque roda com privilégio do dono da
-- função), usada dentro da policy em vez de uma subquery direta na mesma
-- tabela.
create or replace function public.is_farm_member(p_farm_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.farm_members fm
    where fm.farm_id = p_farm_id and fm.user_id = p_user_id
  );
$$;

grant execute on function public.is_farm_member(uuid, uuid) to authenticated;

drop policy if exists "farm_members: membros da fazenda se veem" on public.farm_members;
create policy "farm_members: membros da fazenda se veem"
  on public.farm_members for select
  using (public.is_farm_member(farm_members.farm_id, auth.uid()));
