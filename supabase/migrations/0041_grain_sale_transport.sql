-- Dados de transporte na venda de grão — placa do caminhão, transportadora
-- e valor do frete, tudo opcional (nem toda venda tem frete separado do
-- comprador, e nem todo produtor quer detalhar isso).
alter table public.grain_sales
  add column if not exists truck_plate text,
  add column if not exists carrier_name text,
  add column if not exists freight_cost numeric(12, 2) check (freight_cost >= 0);
