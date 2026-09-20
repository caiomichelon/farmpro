-- Adiciona parâmetro opcional de observação (usa a coluna notes de
-- cattle_lots, criada na migration anterior) — útil pra reconstrução de
-- lotes antigos, onde faz sentido avisar que o peso de entrada é
-- aproximado (vem do registro/compra original, não do dia real de entrada).
--
-- Precisa dropar a versão antiga primeiro: como o novo parâmetro muda a
-- assinatura (uuid, integer[], text, date) -> (..., text), um simples
-- "create or replace" criaria uma segunda função sobrecarregada em vez de
-- substituir, e as duas ficariam ambíguas pra quem chamar com 4 argumentos.
drop function if exists public.create_lot_from_stamped_animals(uuid, integer[], text, date);

create or replace function public.create_lot_from_stamped_animals(
  p_farm_id uuid,
  p_idvs integer[],
  p_lot_name text,
  p_entry_date date default current_date,
  p_notes text default null
)
returns table (
  lot_id uuid,
  matched_count integer,
  already_allocated_idvs integer[],
  not_found_idvs integer[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
  v_avg_weight numeric(8, 2);
  v_matched_count integer;
  v_already_allocated integer[];
  v_not_found integer[];
begin
  if not exists (
    select 1 from public.farm_members fm
    where fm.farm_id = p_farm_id and fm.user_id = auth.uid()
  ) then
    raise exception 'Sem permissão nessa fazenda.';
  end if;

  if p_lot_name is null or trim(p_lot_name) = '' then
    raise exception 'Nome do lote é obrigatório.';
  end if;

  select array_agg(distinct sa.idv) into v_already_allocated
  from public.stamped_animals sa
  where sa.farm_id = p_farm_id
    and sa.idv = any(p_idvs)
    and sa.allocated_lot_id is not null;

  select array_agg(distinct x) into v_not_found
  from unnest(p_idvs) as x
  where not exists (
    select 1 from public.stamped_animals sa2
    where sa2.farm_id = p_farm_id and sa2.idv = x
  );

  select count(*), avg(sa.entry_weight_kg)
    into v_matched_count, v_avg_weight
  from public.stamped_animals sa
  where sa.farm_id = p_farm_id
    and sa.idv = any(p_idvs)
    and sa.allocated_lot_id is null;

  if coalesce(v_matched_count, 0) = 0 then
    raise exception 'Nenhum animal disponível encontrado pra esses números.';
  end if;

  if v_avg_weight is null then
    raise exception 'Os animais encontrados não têm peso registrado no cadastro.';
  end if;

  insert into public.cattle_lots (farm_id, name, entry_date, entry_head_count, entry_avg_weight_kg, notes)
  values (p_farm_id, trim(p_lot_name), coalesce(p_entry_date, current_date), v_matched_count, v_avg_weight, p_notes)
  returning id into v_lot_id;

  insert into public.cattle_animals (
    farm_id, lot_id, tag_number, breed, entry_weight_kg, entry_date, official_id_number, notes
  )
  select
    p_farm_id,
    v_lot_id,
    sa.idv::text,
    sa.breed,
    sa.entry_weight_kg,
    coalesce(sa.entry_date, coalesce(p_entry_date, current_date)),
    sa.official_id_number,
    nullif(
      concat_ws(
        ' · ',
        nullif('Carimbo ' || sa.carimbo, 'Carimbo '),
        nullif(sa.category, ''),
        nullif(sa.lote_label, '')
      ),
      ''
    )
  from public.stamped_animals sa
  where sa.farm_id = p_farm_id
    and sa.idv = any(p_idvs)
    and sa.allocated_lot_id is null;

  update public.stamped_animals sa
  set allocated_lot_id = v_lot_id, allocated_at = now()
  where sa.farm_id = p_farm_id
    and sa.idv = any(p_idvs)
    and sa.allocated_lot_id is null;

  return query select
    v_lot_id,
    v_matched_count,
    coalesce(v_already_allocated, array[]::integer[]),
    coalesce(v_not_found, array[]::integer[]);
end;
$$;

grant execute on function public.create_lot_from_stamped_animals(uuid, integer[], text, date, text) to authenticated;
