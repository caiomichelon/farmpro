-- Corrige bug real encontrado testando de ponta a ponta: os nomes dos OUT
-- params de `returns table (farm_id uuid, farm_name text)` colidiam com a
-- coluna farm_id no INSERT dentro da função (PL/pgSQL trata OUT params como
-- variáveis no escopo inteiro da função), gerando "column reference
-- farm_id is ambiguous" e fazendo todo convite por código falhar.
drop function if exists public.join_farm_by_code(text);

create function public.join_farm_by_code(invite_code text)
returns table (result_farm_id uuid, result_farm_name text)
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
