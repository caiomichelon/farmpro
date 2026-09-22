-- Dados de frete/transporte do abate — mesma ideia já usada na nota de
-- caminhão da colheita (harvest_entries: truck_plate, driver_name) e no
-- frete da venda de grão (grain_sales: freight_cost) — aqui juntando os
-- dois na mesma tabela porque, pro gado, é um evento só (mandar o lote pro
-- frigorífico), sem uma "venda" separada da "colheita" como na lavoura.
alter table public.cattle_slaughters add column if not exists truck_plate text;
alter table public.cattle_slaughters add column if not exists driver_name text;
alter table public.cattle_slaughters add column if not exists freight_cost numeric(12, 2) check (freight_cost is null or freight_cost >= 0);
