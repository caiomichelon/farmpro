-- Tipo de fazenda escolhido obrigatoriamente na criação (Lavoura,
-- Pecuária ou Ambos) — antes disso o setor era só inferido a partir dos
-- talhões já cadastrados, o que deixava uma fazenda 100% lavoura mostrando
-- menu/botão de Pecuária (e vice-versa) até o primeiro talhão daquele tipo
-- ser lançado. O default abaixo existe só pra não quebrar fazendas já
-- existentes — depois de preenchidas, é removido: toda fazenda nova em
-- diante precisa informar o tipo explicitamente.
alter table public.farms
  add column if not exists sector_type text not null default 'ambos'
    check (sector_type in ('lavoura', 'pecuaria', 'ambos'));

-- Fazendas já existentes: infere o tipo a partir dos talhões que já tem
-- cadastrados, em vez de deixar tudo em "ambos".
update public.farms f
set sector_type = case
  when exists (select 1 from public.plots p where p.farm_id = f.id and p.type = 'lavoura')
       and not exists (select 1 from public.plots p where p.farm_id = f.id and p.type = 'pecuaria')
    then 'lavoura'
  when exists (select 1 from public.plots p where p.farm_id = f.id and p.type = 'pecuaria')
       and not exists (select 1 from public.plots p where p.farm_id = f.id and p.type = 'lavoura')
    then 'pecuaria'
  else 'ambos'
end;

alter table public.farms alter column sector_type drop default;
