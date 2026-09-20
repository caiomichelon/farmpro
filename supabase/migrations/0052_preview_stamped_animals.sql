-- Prévia da busca em lote por IDV — usada pela tela de buscar/agrupar antes
-- de confirmar a criação do lote (create_lot_from_stamped_animals, ver
-- migration anterior). Função separada (em vez de só um select via
-- supabase-js) porque a lista de IDVs pode ter mais de mil números: um
-- filtro `.in()` normal manda tudo isso na URL da requisição, arriscando
-- estourar limite de tamanho — como parâmetro de função RPC, vai no corpo
-- da requisição, sem esse limite.
create or replace function public.preview_stamped_animals(p_farm_id uuid, p_idvs integer[])
returns table (
  idv integer,
  entry_date date,
  entry_weight_kg numeric,
  carimbo text,
  lote_label text,
  breed text,
  category text,
  official_id_number text,
  allocated_lot_id uuid,
  allocated_lot_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.farm_members fm
    where fm.farm_id = p_farm_id and fm.user_id = auth.uid()
  ) then
    raise exception 'Sem permissão nessa fazenda.';
  end if;

  return query
  select
    sa.idv,
    sa.entry_date,
    sa.entry_weight_kg,
    sa.carimbo,
    sa.lote_label,
    sa.breed,
    sa.category,
    sa.official_id_number,
    sa.allocated_lot_id,
    cl.name as allocated_lot_name
  from public.stamped_animals sa
  left join public.cattle_lots cl on cl.id = sa.allocated_lot_id
  where sa.farm_id = p_farm_id and sa.idv = any(p_idvs)
  order by sa.idv;
end;
$$;

grant execute on function public.preview_stamped_animals(uuid, integer[]) to authenticated;
