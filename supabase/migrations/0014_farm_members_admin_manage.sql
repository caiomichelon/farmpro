-- farm_members nunca teve policy de DELETE/UPDATE — só existia a de
-- SELECT. Sem isso, o botão "Remover" da tela de Membros falha com
-- permissão negada (RLS nega por padrão o que não tem policy). Segue o
-- mesmo padrão SECURITY DEFINER de is_farm_member (0013) pra evitar
-- recursão, agora checando também o papel.
create or replace function public.is_farm_admin(p_farm_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.farm_members fm
    where fm.farm_id = p_farm_id and fm.user_id = p_user_id and fm.role = 'admin'
  );
$$;

grant execute on function public.is_farm_admin(uuid, uuid) to authenticated;

drop policy if exists "farm_members: admin remove membros" on public.farm_members;
create policy "farm_members: admin remove membros"
  on public.farm_members for delete
  using (public.is_farm_admin(farm_members.farm_id, auth.uid()) and farm_members.user_id <> auth.uid());

drop policy if exists "farm_members: admin muda papel de membros" on public.farm_members;
create policy "farm_members: admin muda papel de membros"
  on public.farm_members for update
  using (public.is_farm_admin(farm_members.farm_id, auth.uid()))
  with check (public.is_farm_admin(farm_members.farm_id, auth.uid()));
