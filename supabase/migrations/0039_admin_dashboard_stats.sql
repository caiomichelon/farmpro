-- Painel administrativo — função que agrega estatísticas de uso reais
-- (fazendas, usuários, cadastros por dia, atividade recente) pra dar
-- visibilidade de crescimento sem precisar de ferramenta externa.
--
-- SECURITY DEFINER porque precisa ler auth.users (fora do alcance do
-- cliente normal via RLS/PostgREST) — mas a própria função checa se quem
-- chamou está na lista de e-mails administradores antes de devolver
-- qualquer coisa, então nenhum outro usuário consegue ver esses dados
-- mesmo tendo permissão de executar a função.
create or replace function public.admin_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text;
  result json;
begin
  select email into caller_email from auth.users where id = auth.uid();

  if caller_email is null or caller_email not in ('caiomichelon29@gmail.com') then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'totalFarms', (select count(*) from public.farms),
    'totalUsers', (select count(*) from auth.users),
    'signupsLast7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'signupsLast30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'activeLast7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'activeLast30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'farmsByDay', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select to_char(created_at::date, 'DD/MM') as day, count(*) as count
        from public.farms
        where created_at > now() - interval '30 days'
        group by created_at::date
        order by created_at::date
      ) t
    ),
    'usersByDay', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select to_char(created_at::date, 'DD/MM') as day, count(*) as count
        from auth.users
        where created_at > now() - interval '30 days'
        group by created_at::date
        order by created_at::date
      ) t
    ),
    'recentFarms', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select name, city, state, created_at
        from public.farms
        order by created_at desc
        limit 10
      ) t
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;
